import { TransactionForm } from "@/components/transaction-form";
import Link from "next/link";

export const metadata = {
  title: "New Transaction — CoinKeeper",
};

export default function NewTransactionPage() {
  return (
    <main className="flex-1 w-full max-w-xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link
          href="/transactions"
          className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Transactions
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">New</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Add Transaction
      </h1>

      <TransactionForm />
    </main>
  );
}
