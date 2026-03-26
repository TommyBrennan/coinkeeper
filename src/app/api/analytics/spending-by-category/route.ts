import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext, getSpaceAccountIds } from "@/lib/space-context";

// GET /api/analytics/spending-by-category — aggregate expenses by category
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

  // Build where clause
  const where: Record<string, unknown> = {
    type: "expense",
  };

  if (context.spaceId) {
    const spaceAccountIds = await getSpaceAccountIds(context.spaceId);
    if (spaceAccountIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, currency: "USD" });
    }
    if (accountId) {
      if (!spaceAccountIds.includes(accountId)) {
        return NextResponse.json({ data: [], total: 0, currency: "USD" });
      }
      where.fromAccountId = accountId;
    } else {
      where.fromAccountId = { in: spaceAccountIds };
    }
  } else {
    where.userId = user.id;
    if (accountId) {
      where.fromAccountId = accountId;
    }
  }

  // Date filters
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }

  // Get all matching expenses with category info
  const transactions = await db.transaction.findMany({
    where,
    select: {
      amount: true,
      currency: true,
      category: {
        select: { id: true, name: true, color: true, icon: true },
      },
    },
  });

  // Aggregate by category
  const categoryMap = new Map<
    string,
    { name: string; color: string | null; icon: string | null; total: number; count: number }
  >();

  let grandTotal = 0;
  // Determine the most common currency for display
  const currencyCounts = new Map<string, number>();

  for (const txn of transactions) {
    const catId = txn.category?.id || "uncategorized";
    const catName = txn.category?.name || "Uncategorized";
    const catColor = txn.category?.color || null;
    const catIcon = txn.category?.icon || null;

    const existing = categoryMap.get(catId);
    if (existing) {
      existing.total += txn.amount;
      existing.count += 1;
    } else {
      categoryMap.set(catId, {
        name: catName,
        color: catColor,
        icon: catIcon,
        total: txn.amount,
        count: 1,
      });
    }

    grandTotal += txn.amount;
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
  const data = Array.from(categoryMap.entries())
    .map(([id, cat]) => ({
      id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      total: Math.round(cat.total * 100) / 100,
      count: cat.count,
      percentage: grandTotal > 0 ? Math.round((cat.total / grandTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    data,
    total: Math.round(grandTotal * 100) / 100,
    currency: primaryCurrency,
    transactionCount: transactions.length,
  });
}
