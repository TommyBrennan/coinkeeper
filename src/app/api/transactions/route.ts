import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext, checkSpacePermission, getSpaceAccountIds } from "@/lib/space-context";

// GET /api/transactions — list transactions with optional filters
export async function GET(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getSpaceContext(user.id);
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type"); // expense, income, transfer
  const accountId = searchParams.get("accountId");
  const from = searchParams.get("from"); // ISO date
  const to = searchParams.get("to"); // ISO date
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where: Record<string, unknown> = {};

  if (context.spaceId) {
    // Space context — show transactions on space accounts
    const spaceAccountIds = await getSpaceAccountIds(context.spaceId);
    if (spaceAccountIds.length === 0) {
      return NextResponse.json({ transactions: [], total: 0 });
    }
    where.OR = [
      { fromAccountId: { in: spaceAccountIds } },
      { toAccountId: { in: spaceAccountIds } },
    ];

    // If filtering by specific account, ensure it's a space account
    if (accountId) {
      if (!spaceAccountIds.includes(accountId)) {
        return NextResponse.json({ transactions: [], total: 0 });
      }
      where.OR = [{ fromAccountId: accountId }, { toAccountId: accountId }];
    }
  } else {
    // Personal context
    where.userId = user.id;
    if (accountId) {
      where.OR = [{ fromAccountId: accountId }, { toAccountId: accountId }];
      // Remove top-level userId and combine with account filter
      delete where.userId;
      where.AND = [
        { userId: user.id },
        { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] },
      ];
      delete where.OR;
    }
  }

  if (type) where.type = type;
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
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getSpaceContext(user.id);

  // Enforce role-based permissions in space context
  if (context.spaceId) {
    const perm = await checkSpacePermission(user.id, context.spaceId, "editor");
    if (!perm.allowed) {
      return NextResponse.json(
        { error: "Viewers cannot create transactions in this space" },
        { status: 403 }
      );
    }
  }

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
    exchangeRate,
    toAmount,
    source,
    isRecurring,
    recurringFrequency,
    receiptId,
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

  // Validate account access (personal or space-scoped)
  if (fromAccountId) {
    const account = await db.account.findFirst({
      where: { id: fromAccountId },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Source account not found" },
        { status: 404 }
      );
    }
    // Check ownership: must be user's personal account or belong to current space
    if (context.spaceId) {
      if (account.spaceId !== context.spaceId) {
        return NextResponse.json(
          { error: "Source account does not belong to this space" },
          { status: 403 }
        );
      }
    } else if (account.userId !== user.id) {
      return NextResponse.json(
        { error: "Source account not found" },
        { status: 404 }
      );
    }
  }

  if (toAccountId) {
    const account = await db.account.findFirst({
      where: { id: toAccountId },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Destination account not found" },
        { status: 404 }
      );
    }
    if (context.spaceId) {
      if (account.spaceId !== context.spaceId) {
        return NextResponse.json(
          { error: "Destination account does not belong to this space" },
          { status: 403 }
        );
      }
    } else if (account.userId !== user.id) {
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
  if (type === "transfer") {
    if (!fromAccountId || !toAccountId) {
      return NextResponse.json(
        { error: "Transfer requires both source and destination accounts" },
        { status: 400 }
      );
    }
    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: "Source and destination accounts must be different" },
        { status: 400 }
      );
    }
  }

  // For transfers, compute the destination amount
  let computedToAmount: number | null = null;
  let computedExchangeRate: number | null = null;

  if (type === "transfer" && fromAccountId && toAccountId) {
    const fromAcc = await db.account.findFirst({
      where: { id: fromAccountId },
    });
    const toAcc = await db.account.findFirst({
      where: { id: toAccountId },
    });

    if (fromAcc && toAcc) {
      if (fromAcc.currency === toAcc.currency) {
        computedExchangeRate = 1;
        computedToAmount = amount;
      } else if (toAmount && typeof toAmount === "number" && toAmount > 0) {
        computedToAmount = toAmount;
        computedExchangeRate = toAmount / amount;
      } else if (
        exchangeRate &&
        typeof exchangeRate === "number" &&
        exchangeRate > 0
      ) {
        computedExchangeRate = exchangeRate;
        computedToAmount = amount * exchangeRate;
      } else {
        computedExchangeRate = 1;
        computedToAmount = amount;
      }
    }
  }

  // Create recurring rule if needed
  let recurringId: string | null = null;
  if (isRecurring && recurringFrequency) {
    const txnDate = date ? new Date(date) : new Date();
    const nextExecution = new Date(txnDate);
    if (recurringFrequency === "daily") {
      nextExecution.setDate(nextExecution.getDate() + 1);
    } else if (recurringFrequency === "weekly") {
      nextExecution.setDate(nextExecution.getDate() + 7);
    } else {
      nextExecution.setMonth(nextExecution.getMonth() + 1);
    }

    const rule = await db.recurringRule.create({
      data: {
        frequency: recurringFrequency,
        interval: 1,
        nextExecution,
        lastExecution: txnDate,
        isActive: true,
      },
    });
    recurringId = rule.id;
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
        source: source?.trim() || null,
        date: date ? new Date(date) : new Date(),
        categoryId: categoryId || null,
        fromAccountId: fromAccountId || null,
        toAccountId: toAccountId || null,
        exchangeRate: computedExchangeRate,
        toAmount: computedToAmount,
        receiptId: receiptId || null,
        isRecurring: !!isRecurring,
        recurringId,
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
      if (toAccountId && computedToAmount !== null) {
        await tx.account.update({
          where: { id: toAccountId },
          data: { balance: { increment: computedToAmount } },
        });
      }
    }

    return txn;
  });

  return NextResponse.json(transaction, { status: 201 });
}
