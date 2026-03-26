import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext, getSpaceAccountIds } from "@/lib/space-context";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// GET /api/transactions/export — export transactions as CSV
export async function GET(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getSpaceContext(user.id);
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type");
  const accountId = searchParams.get("accountId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Build where clause (same logic as GET /api/transactions)
  const where: Record<string, unknown> = {};

  if (context.spaceId) {
    const spaceAccountIds = await getSpaceAccountIds(context.spaceId);
    if (spaceAccountIds.length === 0) {
      return new Response("", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="transactions.csv"',
        },
      });
    }
    where.OR = [
      { fromAccountId: { in: spaceAccountIds } },
      { toAccountId: { in: spaceAccountIds } },
    ];

    if (accountId) {
      if (!spaceAccountIds.includes(accountId)) {
        return new Response("", {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="transactions.csv"',
          },
        });
      }
      where.OR = [{ fromAccountId: accountId }, { toAccountId: accountId }];
    }
  } else {
    where.userId = user.id;
    if (accountId) {
      delete where.userId;
      where.AND = [
        { userId: user.id },
        { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] },
      ];
    }
  }

  if (type) where.type = type;
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }

  const transactions = await db.transaction.findMany({
    where,
    include: {
      category: true,
      fromAccount: { select: { id: true, name: true, currency: true } },
      toAccount: { select: { id: true, name: true, currency: true } },
    },
    orderBy: { date: "desc" },
  });

  // Build CSV
  const headers = [
    "Date",
    "Type",
    "Amount",
    "Currency",
    "Description",
    "Category",
    "From Account",
    "To Account",
    "Exchange Rate",
    "To Amount",
  ];

  const rows = transactions.map((txn) => [
    new Date(txn.date).toISOString().split("T")[0],
    txn.type,
    txn.amount.toString(),
    txn.currency,
    txn.description || "",
    txn.category?.name || "",
    txn.fromAccount?.name || "",
    txn.toAccount?.name || "",
    txn.exchangeRate != null ? txn.exchangeRate.toString() : "",
    txn.toAmount != null ? txn.toAmount.toString() : "",
  ]);

  const csvContent =
    headers.map(escapeCsvField).join(",") +
    "\n" +
    rows.map((row) => row.map(escapeCsvField).join(",")).join("\n");

  const today = new Date().toISOString().split("T")[0];
  const filename = `coinkeeper-transactions-${today}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
