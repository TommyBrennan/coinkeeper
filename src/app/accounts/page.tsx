import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AccountCard } from "@/components/account-card";
import { getSpaceContext } from "@/lib/space-context";
import Link from "next/link";

export const metadata = {
  title: "Accounts — CoinKeeper",
};

export default async function AccountsPage() {
  const user = await requireUser();
  const context = await getSpaceContext(user.id);

  const accountWhere = context.spaceId
    ? { spaceId: context.spaceId, isArchived: false }
    : { userId: user.id, spaceId: null, isArchived: false };

  const accounts = await db.account.findMany({
    where: accountWhere,
    orderBy: { createdAt: "desc" },
  });

  const canCreate = !context.spaceId || context.role !== "viewer";

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {context.spaceId ? `${context.spaceName} — Accounts` : "Accounts"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {accounts.length === 0
              ? "No accounts yet"
              : `${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
            {context.spaceId && context.role && (
              <span className="capitalize"> · {context.role}</span>
            )}
          </p>
        </div>
        {canCreate && (
        <Link
          href="/accounts/new"
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
          Add Account
        </Link>
        )}
      </div>

      {/* Account List */}
      {accounts.length === 0 ? (
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
              d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            No accounts yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {context.spaceId && context.role === "viewer"
              ? "No accounts in this space yet."
              : "Create your first account to start tracking your finances."}
          </p>
          {canCreate && (
            <Link
              href="/accounts/new"
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
              Create Account
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </main>
  );
}
