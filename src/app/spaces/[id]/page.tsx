import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeleteSpaceButton } from "@/components/delete-space-button";

const roleColors: Record<string, string> = {
  owner:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  editor:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  viewer:
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await db.space.findUnique({ where: { id } });
  return { title: space ? `${space.name} — CoinKeeper` : "Space — CoinKeeper" };
}

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const membership = await db.spaceMember.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId: id } },
  });

  if (!membership) {
    notFound();
  }

  const space = await db.space.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { role: "asc" },
      },
      accounts: {
        where: { isArchived: false },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!space) {
    notFound();
  }

  const isOwner = membership.role === "owner";

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/spaces"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          &larr; Back to Spaces
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <svg
              className="w-6 h-6 text-violet-600 dark:text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
              />
            </svg>
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {space.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {space.members.length} member
              {space.members.length === 1 ? "" : "s"} &middot;{" "}
              {space.accounts.length} account
              {space.accounts.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <Link
              href={`/spaces/${space.id}/edit`}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Edit
            </Link>
            <DeleteSpaceButton
              spaceId={space.id}
              spaceName={space.name}
              hasAccounts={space.accounts.length > 0}
            />
          </div>
        )}
      </div>

      {/* Members Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Members
        </h2>
        <div className="space-y-2">
          {space.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">
                  {member.user.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {member.user.name}
                    {member.user.id === user.id && (
                      <span className="text-gray-400 dark:text-gray-500 ml-1">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {member.user.email}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[member.role] || roleColors.viewer}`}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Accounts Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Shared Accounts
        </h2>
        {space.accounts.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No shared accounts yet. Accounts linked to this space will appear
              here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {space.accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {account.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {account.type} &middot; {account.currency}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {account.balance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {account.currency}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
