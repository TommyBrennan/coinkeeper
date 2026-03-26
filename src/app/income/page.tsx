import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { IncomeCard } from "@/components/income-card";

export const metadata = {
  title: "Income — CoinKeeper",
};

export default async function IncomePage() {
  const user = await requireUser();

  const incomeTransactions = await db.transaction.findMany({
    where: { userId: user.id, type: "income" },
    include: {
      category: true,
      toAccount: {
        select: { id: true, name: true, currency: true, color: true },
      },
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  // Calculate total income by currency
  const totalsByCurrency: Record<string, number> = {};
  for (const txn of incomeTransactions) {
    const curr = txn.currency;
    totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + txn.amount;
  }

  // Group by month
  const grouped: Record<string, typeof incomeTransactions> = {};
  for (const txn of incomeTransactions) {
    const d = new Date(txn.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(txn);
  }

  const monthKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  function formatMonth(key: string): string {
    const [year, month] = key.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Income
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {Object.entries(totalsByCurrency).length > 0 ? (
              Object.entries(totalsByCurrency).map(([currency, total]) => (
                <span
                  key={currency}
                  className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
                >
                  +{formatMoney(total, currency)}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No income recorded yet
              </p>
            )}
          </div>
        </div>
        <Link
          href="/income/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Income
        </Link>
      </div>

      {/* Income List */}
      {incomeTransactions.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <svg
            className="w-12 h-12 mx-auto text-emerald-300 dark:text-emerald-700 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            No income recorded yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Start tracking your income sources and amounts.
          </p>
          <Link
            href="/income/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Add Income
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {monthKeys.map((monthKey) => {
            const monthTotal: Record<string, number> = {};
            for (const txn of grouped[monthKey]) {
              monthTotal[txn.currency] =
                (monthTotal[txn.currency] || 0) + txn.amount;
            }

            return (
              <section key={monthKey}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {formatMonth(monthKey)}
                  </h2>
                  <div className="flex items-center gap-2">
                    {Object.entries(monthTotal).map(([currency, total]) => (
                      <span
                        key={currency}
                        className="text-xs font-medium text-emerald-600 dark:text-emerald-400"
                      >
                        +{formatMoney(total, currency)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {grouped[monthKey].map((txn) => (
                    <IncomeCard
                      key={txn.id}
                      transaction={{
                        id: txn.id,
                        amount: txn.amount,
                        currency: txn.currency,
                        description: txn.description,
                        source: txn.source,
                        date: txn.date.toISOString(),
                        isRecurring: txn.isRecurring,
                        category: txn.category,
                        toAccount: txn.toAccount,
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
