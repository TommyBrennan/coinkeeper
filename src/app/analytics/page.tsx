import { requireUser } from "@/lib/auth";
import { SpendingByCategory } from "@/components/spending-by-category";

export default async function AnalyticsPage() {
  await requireUser();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Analytics
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Understand your spending patterns
        </p>
      </div>

      <SpendingByCategory />
    </div>
  );
}
