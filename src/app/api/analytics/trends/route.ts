import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext, getSpaceAccountIds } from "@/lib/space-context";

// GET /api/analytics/trends — monthly income vs expense aggregation
export async function GET(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getSpaceContext(user.id);
  const { searchParams } = new URL(request.url);

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const accountId = searchParams.get("accountId");

  // Build where clause for income transactions
  const baseWhere: Record<string, unknown> = {};

  if (context.spaceId) {
    const spaceAccountIds = await getSpaceAccountIds(context.spaceId);
    if (spaceAccountIds.length === 0) {
      return NextResponse.json({ data: [], currency: "USD" });
    }
    if (accountId) {
      if (!spaceAccountIds.includes(accountId)) {
        return NextResponse.json({ data: [], currency: "USD" });
      }
      baseWhere.OR = [
        { fromAccountId: accountId },
        { toAccountId: accountId },
      ];
    } else {
      baseWhere.OR = [
        { fromAccountId: { in: spaceAccountIds } },
        { toAccountId: { in: spaceAccountIds } },
      ];
    }
  } else {
    baseWhere.userId = user.id;
    if (accountId) {
      baseWhere.OR = [
        { fromAccountId: accountId },
        { toAccountId: accountId },
      ];
      // Remove userId from top level when using OR
      delete baseWhere.userId;
      baseWhere.AND = [
        { userId: user.id },
        {
          OR: [
            { fromAccountId: accountId },
            { toAccountId: accountId },
          ],
        },
      ];
      delete baseWhere.OR;
    }
  }

  // Date filters
  if (from || to) {
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    baseWhere.date = dateFilter;
  }

  // Get all income and expense transactions
  const transactions = await db.transaction.findMany({
    where: {
      ...baseWhere,
      type: { in: ["income", "expense"] },
    },
    select: {
      type: true,
      amount: true,
      currency: true,
      date: true,
    },
    orderBy: { date: "asc" },
  });

  // Aggregate by month
  const monthMap = new Map<
    string,
    { month: string; income: number; expense: number }
  >();

  const currencyCounts = new Map<string, number>();

  for (const txn of transactions) {
    const date = new Date(txn.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    let entry = monthMap.get(monthKey);
    if (!entry) {
      entry = { month: monthKey, income: 0, expense: 0 };
      monthMap.set(monthKey, entry);
    }

    if (txn.type === "income") {
      entry.income += txn.amount;
    } else if (txn.type === "expense") {
      entry.expense += txn.amount;
    }

    currencyCounts.set(txn.currency, (currencyCounts.get(txn.currency) || 0) + 1);
  }

  // Most common currency
  let primaryCurrency = "USD";
  let maxCount = 0;
  for (const [currency, count] of currencyCounts) {
    if (count > maxCount) {
      maxCount = count;
      primaryCurrency = currency;
    }
  }

  // Convert to sorted array
  const data = Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((entry) => ({
      month: entry.month,
      monthLabel: formatMonthLabel(entry.month),
      income: Math.round(entry.income * 100) / 100,
      expense: Math.round(entry.expense * 100) / 100,
      net: Math.round((entry.income - entry.expense) * 100) / 100,
    }));

  return NextResponse.json({ data, currency: primaryCurrency });
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
