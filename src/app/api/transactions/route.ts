import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/transactions — list transactions with optional filters
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type"); // expense, income, transfer
  const accountId = searchParams.get("accountId");
  const from = searchParams.get("from"); // ISO date
  const to = searchParams.get("to"); // ISO date
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where: Record<string, unknown> = { userId: user.id };

  if (type) where.type = type;
  if (accountId) {
    where.OR = [{ fromAccountId: accountId }, { toAccountId: accountId }];
  }
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: {
        category: true,
        fromAccount: { select: { id: true, name: true, currency: true, color: true } },
        toAccount: { select: { id: true, name: true, currency: true, color: true } },
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    }),
    db.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total });
}

// POST /api/transactions — create expense or income
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const body = await request.json();

  const {
    type,
    amount,
    currency,
    description,
    date,
    categoryId,
    fromAccountId,
    toAccountId,
  } = body;

  // Validate type
  const validTypes = ["expense", "income", "transfer"];
  if (!type || !validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Type must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate amount
  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 }
    );
  }

  // Validate account ownership
  if (fromAccountId) {
    const account = await db.account.findFirst({
      where: { id: fromAccountId, userId: user.id },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Source account not found" },
        { status: 404 }
      );
    }
  }

  if (toAccountId) {
    const account = await db.account.findFirst({
      where: { id: toAccountId, userId: user.id },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Destination account not found" },
        { status: 404 }
      );
    }
  }

  // Type-specific validation
  if (type === "expense" && !fromAccountId) {
    return NextResponse.json(
      { error: "Expense requires a source account" },
      { status: 400 }
    );
  }
  if (type === "income" && !toAccountId) {
    return NextResponse.json(
      { error: "Income requires a destination account" },
      { status: 400 }
    );
  }

  // Create transaction and update account balance atomically
  const transaction = await db.$transaction(async (tx) => {
    const txn = await tx.transaction.create({
      data: {
        userId: user.id,
        type,
        amount,
        currency: currency || "USD",
        description: description?.trim() || null,
        date: date ? new Date(date) : new Date(),
        categoryId: categoryId || null,
        fromAccountId: fromAccountId || null,
        toAccountId: toAccountId || null,
      },
      include: {
        category: true,
        fromAccount: { select: { id: true, name: true, currency: true } },
        toAccount: { select: { id: true, name: true, currency: true } },
      },
    });

    // Update account balances
    if (type === "expense" && fromAccountId) {
      await tx.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } },
      });
    } else if (type === "income" && toAccountId) {
      await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount } },
      });
    } else if (type === "transfer") {
      if (fromAccountId) {
        await tx.account.update({
          where: { id: fromAccountId },
          data: { balance: { decrement: amount } },
        });
      }
      if (toAccountId) {
        await tx.account.update({
          where: { id: toAccountId },
          data: { balance: { increment: amount } },
        });
      }
    }

    return txn;
  });

  return NextResponse.json(transaction, { status: 201 });
}
