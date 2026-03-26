import { requireUser } from "@/lib/auth";
import { SpendingByCategory } from "@/components/spending-by-category";
import { IncomeVsExpenseTrends } from "@/components/income-vs-expense-trends";
import { BalanceEvolution } from "@/components/balance-evolution";

export default async function AnalyticsPage() {
  await requireUser();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Analytics
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Understand your spending patterns and financial trends
        </p>
      </div>

      <div className="space-y-6">
        <SpendingByCategory />
        <IncomeVsExpenseTrends />
        <BalanceEvolution />
      </div>
    </div>
  );
}
