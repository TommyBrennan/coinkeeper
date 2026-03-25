import { IncomeForm } from "@/components/income-form";
import Link from "next/link";

export const metadata = {
  title: "Add Income — CoinKeeper",
};

export default function NewIncomePage() {
  return (
    <main className="flex-1 w-full max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/income"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          &larr; Back to Income
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
          Add Income
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Record an income entry with source and category.
        </p>
      </div>

      <IncomeForm />
    </main>
  );
}
