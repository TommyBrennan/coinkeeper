import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMoney, accountTypeLabel } from "@/lib/format";
import { NetWorthSummary } from "@/components/net-worth-summary";

export const dynamic = "force-dynamic";

const typeIcons: Record<string, string> = {
  cash: "💵",
  bank: "🏦",
  wallet: "👛",
  credit: "💳",
};

const categoryEmojis: Record<string, string> = {
  utensils: "🍽️",
  car: "🚗",
  "shopping-bag": "🛍️",
  film: "🎬",
  zap: "⚡",
  heart: "❤️",
  book: "📚",
  briefcase: "💼",
  laptop: "💻",
  "trending-up": "📈",
  gift: "🎁",
  star: "⭐",
  home: "🏠",
  percent: "📊",
  "rotate-ccw": "🔄",
  "more-horizontal": "•••",
};

export default async function Dashboard() {
  const user = await requireUser();

  const [accounts, recentTransactions] = await Promise.all([
    db.account.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: "desc" },
    }),
    db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
      },
    }),
  ]);

  const hasAccounts = accounts.length > 0;

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Balance Summary */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Dashboard
            </h1>
          </div>

          {hasAccounts ? (
            <NetWorthSummary />
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Welcome to CoinKeeper
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Create your first account to start tracking your finances.
              </p>
              <Link
                href="/accounts/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
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
                Create Account
              </Link>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        {hasAccounts && (
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickAction
                href="/transactions/new"
                label="Add Expense"
                icon="💸"
                color="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
              />
              <QuickAction
                href="/income/new"
                label="Add Income"
                icon="💰"
                color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
              />
              <QuickAction
                href="/transfers/new"
                label="Transfer"
                icon="🔄"
                color="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
              />
              <QuickAction
                href="/accounts/new"
                label="New Account"
                icon="➕"
                color="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
              />
            </div>
          </section>
        )}

        {/* Accounts Grid */}
        {hasAccounts && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Accounts
              </h2>
              <Link
                href="/accounts"
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/accounts/${account.id}/edit`}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                >
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 text-lg"
                    style={{
                      backgroundColor: account.color
                        ? `${account.color}20`
                        : "rgb(243 244 246)",
                    }}
                  >
                    {typeIcons[account.type] || "💵"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {account.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {accountTypeLabel(account.type)}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold tabular-nums shrink-0 ${
                      account.balance < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {formatMoney(account.balance, account.currency)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent Transactions */}
        {hasAccounts && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Recent Transactions
              </h2>
              <Link
                href="/transactions"
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                View all
              </Link>
            </div>

            {recentTransactions.length > 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                {recentTransactions.map((tx) => {
                  const isExpense = tx.type === "expense";
                  const isIncome = tx.type === "income";
                  const isTransfer = tx.type === "transfer";
                  const account = isExpense ? tx.fromAccount : tx.toAccount;
                  const categoryIcon = tx.category?.icon
                    ? categoryEmojis[tx.category.icon] || ""
                    : "";

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      {/* Icon */}
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-sm"
                        style={{
                          backgroundColor: isTransfer
                            ? "rgb(219 234 254)"
                            : tx.category?.color
                              ? `${tx.category.color}20`
                              : "rgb(243 244 246)",
                          color: isTransfer
                            ? "rgb(37 99 235)"
                            : tx.category?.color || "rgb(107 114 128)",
                        }}
                      >
                        {isTransfer
                          ? "⇄"
                          : categoryIcon || (isIncome ? "💰" : "💸")}
                      </div>

                      {/* Description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {isTransfer
                            ? tx.description || "Transfer"
                            : tx.description ||
                              tx.category?.name ||
                              (isIncome ? "Income" : "Expense")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {isTransfer ? (
                            <>
                              {tx.fromAccount?.name || "?"} →{" "}
                              {tx.toAccount?.name || "?"}
                            </>
                          ) : (
                            <>
                              {tx.category?.name || "Uncategorized"}
                              {account && ` · ${account.name}`}
                            </>
                          )}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-semibold tabular-nums ${
                            isTransfer
                              ? "text-blue-600 dark:text-blue-400"
                              : isExpense
                                ? "text-red-600 dark:text-red-400"
                                : isIncome
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {isExpense ? "-" : isIncome ? "+" : ""}
                          {formatMoney(tx.amount, tx.currency)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                          {new Date(tx.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No transactions yet. Add your first expense or income to get
                  started.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function QuickAction({
  href,
  label,
  icon,
  color,
}: {
  href: string;
  label: string;
  icon: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm transition-colors hover:opacity-80 ${color}`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </Link>
  );
}
