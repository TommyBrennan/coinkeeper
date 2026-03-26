import { requireUser } from "@/lib/auth";
import { InsightsDashboard } from "@/components/insights-dashboard";

export const metadata = {
  title: "AI Insights — CoinKeeper",
};

export default async function InsightsPage() {
  await requireUser();

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          AI Insights
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          AI-powered analysis of your spending patterns and financial health
        </p>
      </div>

      <InsightsDashboard />
    </main>
  );
}
