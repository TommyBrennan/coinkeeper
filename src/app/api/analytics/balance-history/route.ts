import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext } from "@/lib/space-context";

// GET /api/analytics/balance-history — daily balance evolution
export async function GET(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getSpaceContext(user.id);
  const { searchParams } = new URL(request.url);

  const accountId = searchParams.get("accountId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Get relevant accounts
  let accounts: { id: string; name: string; currency: string; balance: number }[];

  if (context.spaceId) {
    accounts = await db.account.findMany({
      where: {
        spaceId: context.spaceId,
        isArchived: false,
        ...(accountId ? { id: accountId } : {}),
      },
      select: { id: true, name: true, currency: true, balance: true },
    });
  } else {
    accounts = await db.account.findMany({
      where: {
        userId: user.id,
        spaceId: null,
        isArchived: false,
        ...(accountId ? { id: accountId } : {}),
      },
      select: { id: true, name: true, currency: true, balance: true },
    });
  }

  if (accounts.length === 0) {
    return NextResponse.json({ data: [], accounts: [], currency: "USD" });
  }

  const accountIds = accounts.map((a) => a.id);

  // Build transaction query
  const txnWhere: Record<string, unknown> = {
    OR: [
      { fromAccountId: { in: accountIds } },
      { toAccountId: { in: accountIds } },
    ],
  };

  if (from || to) {
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    txnWhere.date = dateFilter;
  }

  // Get all transactions for these accounts, ordered by date
  const transactions = await db.transaction.findMany({
    where: txnWhere,
    select: {
      type: true,
      amount: true,
      toAmount: true,
      date: true,
      fromAccountId: true,
      toAccountId: true,
    },
    orderBy: { date: "asc" },
  });

  // Compute daily running balance by working forward from current balance - total effect of all transactions
  // First compute the net effect of ALL transactions to get the starting balance
  const currentBalances = new Map(accounts.map((a) => [a.id, a.balance]));

  // Compute total net effect per account from all transactions (not just filtered ones)
  const allTransactions = await db.transaction.findMany({
    where: {
      OR: [
        { fromAccountId: { in: accountIds } },
        { toAccountId: { in: accountIds } },
      ],
    },
    select: {
      type: true,
      amount: true,
      toAmount: true,
      fromAccountId: true,
      toAccountId: true,
    },
  });

  // Work backwards: current balance = starting balance + all transaction effects
  // So starting balance = current balance - all transaction effects
  const netEffects = new Map<string, number>();
  for (const txn of allTransactions) {
    if (txn.type === "income" && txn.toAccountId && accountIds.includes(txn.toAccountId)) {
      const current = netEffects.get(txn.toAccountId) || 0;
      netEffects.set(txn.toAccountId, current + (txn.toAmount || txn.amount));
    } else if (txn.type === "expense" && txn.fromAccountId && accountIds.includes(txn.fromAccountId)) {
      const current = netEffects.get(txn.fromAccountId) || 0;
      netEffects.set(txn.fromAccountId, current - txn.amount);
    } else if (txn.type === "transfer") {
      if (txn.fromAccountId && accountIds.includes(txn.fromAccountId)) {
        const current = netEffects.get(txn.fromAccountId) || 0;
        netEffects.set(txn.fromAccountId, current - txn.amount);
      }
      if (txn.toAccountId && accountIds.includes(txn.toAccountId)) {
        const current = netEffects.get(txn.toAccountId) || 0;
        netEffects.set(txn.toAccountId, current + (txn.toAmount || txn.amount));
      }
    }
  }

  // Starting balances
  const startingBalances = new Map<string, number>();
  for (const [accId, currentBal] of currentBalances) {
    const netEffect = netEffects.get(accId) || 0;
    startingBalances.set(accId, currentBal - netEffect);
  }

  // Build daily balance snapshots by replaying filtered transactions forward
  const runningBalances = new Map<string, number>();
  for (const [accId, startBal] of startingBalances) {
    runningBalances.set(accId, startBal);
  }

  // If there are filtered transactions before our window, we need to account for them too
  // Get transactions before the window to establish the correct starting point
  if (from) {
    const priorTransactions = await db.transaction.findMany({
      where: {
        OR: [
          { fromAccountId: { in: accountIds } },
          { toAccountId: { in: accountIds } },
        ],
        date: { lt: new Date(from) },
      },
      select: {
        type: true,
        amount: true,
        toAmount: true,
        fromAccountId: true,
        toAccountId: true,
      },
    });

    for (const txn of priorTransactions) {
      applyTransaction(txn, runningBalances, accountIds);
    }
  } else {
    // No from filter — replay all transactions from the beginning
    // runningBalances already has starting balances (before any transactions)
  }

  // Now replay filtered transactions day by day
  const dayMap = new Map<string, { date: string; total: number }>();

  // Add starting point
  if (transactions.length > 0) {
    const firstDate = toDateKey(new Date(transactions[0].date));
    const totalBefore = sumBalances(runningBalances);
    dayMap.set(firstDate, { date: firstDate, total: Math.round(totalBefore * 100) / 100 });
  }

  for (const txn of transactions) {
    applyTransaction(txn, runningBalances, accountIds);
    const dateKey = toDateKey(new Date(txn.date));
    const totalBalance = sumBalances(runningBalances);
    dayMap.set(dateKey, { date: dateKey, total: Math.round(totalBalance * 100) / 100 });
  }

  const data = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Determine primary currency
  const currencyCounts = new Map<string, number>();
  for (const acc of accounts) {
    currencyCounts.set(acc.currency, (currencyCounts.get(acc.currency) || 0) + 1);
  }
  let primaryCurrency = "USD";
  let maxCount = 0;
  for (const [currency, count] of currencyCounts) {
    if (count > maxCount) {
      maxCount = count;
      primaryCurrency = currency;
    }
  }

  return NextResponse.json({
    data,
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency })),
    currency: primaryCurrency,
  });
}

function applyTransaction(
  txn: { type: string; amount: number; toAmount: number | null; fromAccountId: string | null; toAccountId: string | null },
  balances: Map<string, number>,
  accountIds: string[]
) {
  if (txn.type === "income" && txn.toAccountId && accountIds.includes(txn.toAccountId)) {
    const current = balances.get(txn.toAccountId) || 0;
    balances.set(txn.toAccountId, current + (txn.toAmount || txn.amount));
  } else if (txn.type === "expense" && txn.fromAccountId && accountIds.includes(txn.fromAccountId)) {
    const current = balances.get(txn.fromAccountId) || 0;
    balances.set(txn.fromAccountId, current - txn.amount);
  } else if (txn.type === "transfer") {
    if (txn.fromAccountId && accountIds.includes(txn.fromAccountId)) {
      const current = balances.get(txn.fromAccountId) || 0;
      balances.set(txn.fromAccountId, current - txn.amount);
    }
    if (txn.toAccountId && accountIds.includes(txn.toAccountId)) {
      const current = balances.get(txn.toAccountId) || 0;
      balances.set(txn.toAccountId, current + (txn.toAmount || txn.amount));
    }
  }
}

function sumBalances(balances: Map<string, number>): number {
  let total = 0;
  for (const bal of balances.values()) {
    total += bal;
  }
  return total;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
