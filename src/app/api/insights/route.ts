import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext, getSpaceAccountIds } from "@/lib/space-context";
import { generateInsights, type FinancialData } from "@/lib/insights";

// Simple in-memory cache to avoid repeated AI calls
const insightsCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(userId: string, spaceId: string | null, period: string): string {
  return `${userId}:${spaceId || "personal"}:${period}`;
}

// GET /api/insights — generate AI financial insights
export async function GET(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getSpaceContext(user.id);
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "30d";
  const refresh = searchParams.get("refresh") === "true";

  // Validate period
  const validPeriods = ["30d", "90d", "1y"];
  if (!validPeriods.includes(period)) {
    return NextResponse.json(
      { error: "Invalid period. Use: 30d, 90d, or 1y" },
      { status: 400 }
    );
  }

  // Check cache unless refresh requested
  const cacheKey = getCacheKey(user.id, context.spaceId, period);
  if (!refresh) {
    const cached = insightsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }
  }

  // Calculate date range
  const now = new Date();
  const from = new Date(now);
  if (period === "30d") {
    from.setDate(from.getDate() - 30);
  } else if (period === "90d") {
    from.setDate(from.getDate() - 90);
  } else {
    from.setFullYear(from.getFullYear() - 1);
  }

  // Build account filter based on space context
  const accountFilter: Record<string, unknown> = {};
  let spaceAccountIds: string[] = [];

  if (context.spaceId) {
    spaceAccountIds = await getSpaceAccountIds(context.spaceId);
    if (spaceAccountIds.length === 0) {
      const emptyResult = {
        insights: [],
        generatedAt: new Date().toISOString(),
        period,
        summary: "No accounts found in this space.",
      };
      return NextResponse.json(emptyResult);
    }
    accountFilter.fromAccountId = { in: spaceAccountIds };
  } else {
    accountFilter.userId = user.id;
  }

  // Fetch spending by category
  const expenseTransactions = await db.transaction.findMany({
    where: {
      ...accountFilter,
      type: "expense",
      date: { gte: from, lte: now },
    },
    select: {
      amount: true,
      currency: true,
      category: {
        select: { name: true },
      },
    },
  });

  // Aggregate by category
  const categoryMap = new Map<string, { total: number; count: number }>();
  let totalExpenses = 0;
  const currencyCounts = new Map<string, number>();

  for (const txn of expenseTransactions) {
    const catName = txn.category?.name || "Uncategorized";
    const existing = categoryMap.get(catName);
    if (existing) {
      existing.total += txn.amount;
      existing.count += 1;
    } else {
      categoryMap.set(catName, { total: txn.amount, count: 1 });
    }
    totalExpenses += txn.amount;
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

  const spendingByCategory = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
      percentage: totalExpenses > 0 ? Math.round((data.total / totalExpenses) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Fetch income/expense trends
  const trendTransactions = await db.transaction.findMany({
    where: {
      ...accountFilter,
      type: { in: ["income", "expense"] },
      date: { gte: from, lte: now },
    },
    select: {
      type: true,
      amount: true,
      date: true,
    },
    orderBy: { date: "asc" },
  });

  // Aggregate by month
  const monthMap = new Map<string, { income: number; expense: number }>();
  let totalIncome = 0;

  for (const txn of trendTransactions) {
    const date = new Date(txn.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    let entry = monthMap.get(monthKey);
    if (!entry) {
      entry = { income: 0, expense: 0 };
      monthMap.set(monthKey, entry);
    }

    if (txn.type === "income") {
      entry.income += txn.amount;
      totalIncome += txn.amount;
    } else {
      entry.expense += txn.amount;
    }
  }

  const trends = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      monthLabel: formatMonthLabel(month),
      income: Math.round(data.income * 100) / 100,
      expense: Math.round(data.expense * 100) / 100,
      net: Math.round((data.income - data.expense) * 100) / 100,
    }));

  // Count accounts
  const accountCount = context.spaceId
    ? spaceAccountIds.length
    : await db.account.count({ where: { userId: user.id } });

  // Build financial data for AI analysis
  const financialData: FinancialData = {
    spendingByCategory,
    trends,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    currency: primaryCurrency,
    transactionCount: trendTransactions.length,
    accountCount,
    period,
  };

  // Generate insights
  const result = await generateInsights(financialData);

  // Cache the result
  insightsCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return NextResponse.json(result);
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
