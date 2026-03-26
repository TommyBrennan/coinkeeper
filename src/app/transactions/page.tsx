import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSpaceContext, getSpaceAccountIds } from "@/lib/space-context";
import { TransactionCard } from "@/components/transaction-card";
import { ExportButton } from "@/components/export-button";
import { ImportButton } from "@/components/import-button";
import Link from "next/link";

export const metadata = {
  title: "Transactions — CoinKeeper",
};

function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export default async function TransactionsPage() {
  const user = await requireUser();
  const context = await getSpaceContext(user.id);

  // Determine if user can create transactions in this context
  const canCreate = !context.spaceId || context.role !== "viewer";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let transactions: any[];
  if (context.spaceId) {
    // Space context — show transactions on space accounts
    const spaceAccountIds = await getSpaceAccountIds(context.spaceId);
    if (spaceAccountIds.length === 0) {
      transactions = [];
    } else {
      transactions = await db.transaction.findMany({
        where: {
          OR: [
            { fromAccountId: { in: spaceAccountIds } },
            { toAccountId: { in: spaceAccountIds } },
          ],
        },
        include: {
          category: true,
          fromAccount: {
            select: { id: true, name: true, currency: true, color: true },
          },
          toAccount: {
            select: { id: true, name: true, currency: true, color: true },
          },
        },
        orderBy: { date: "desc" },
        take: 50,
      });
    }
  } else {
    // Personal context
    transactions = await db.transaction.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        fromAccount: {
          select: { id: true, name: true, currency: true, color: true },
        },
        toAccount: {
          select: { id: true, name: true, currency: true, color: true },
        },
      },
      orderBy: { date: "desc" },
      take: 50,
    });
  }

  // Group by date
  const grouped: Record<string, typeof transactions> = {};
  for (const txn of transactions) {
    const key = new Date(txn.date).toISOString().split("T")[0];
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(txn);
  }

  const dateKeys = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Transactions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {transactions.length === 0
              ? "No transactions yet"
              : `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && <ImportButton />}
          {transactions.length > 0 && <ExportButton />}
          {canCreate && (
            <Link
              href="/transactions/new"
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
              Add Transaction
            </Link>
          )}
        </div>
      </div>

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            No transactions yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {context.spaceId
              ? "No transactions in this space yet."
              : "Record your first expense or income to start tracking."}
          </p>
          {canCreate && (
            <Link
              href="/transactions/new"
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
              Add Transaction
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {dateKeys.map((dateKey) => (
            <section key={dateKey}>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
                {formatDateHeading(dateKey)}
              </h2>
              <div className="space-y-2">
                {grouped[dateKey].map((txn) => (
                  <TransactionCard
                    key={txn.id}
                    transaction={{
                      ...txn,
                      date: txn.date.toISOString(),
                      description: txn.description,
                      exchangeRate: txn.exchangeRate,
                      toAmount: txn.toAmount,
                      category: txn.category,
                      fromAccount: txn.fromAccount,
                      toAccount: txn.toAccount,
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
