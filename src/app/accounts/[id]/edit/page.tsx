import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { AccountForm } from "@/components/account-form";
import { notFound } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "Edit Account — CoinKeeper",
};

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  const account = await db.account.findFirst({
    where: { id, userId: user.id },
  });

  if (!account) {
    notFound();
  }

  return (
    <main className="flex-1 w-full max-w-xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link
          href="/accounts"
          className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Accounts
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">
          Edit {account.name}
        </span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Edit Account
      </h1>

      <AccountForm
        initialData={{
          id: account.id,
          name: account.name,
          type: account.type,
          currency: account.currency,
          balance: account.balance,
          icon: account.icon,
          color: account.color,
        }}
      />
    </main>
  );
}
