import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { ScheduledTransferCard } from "@/components/scheduled-transfer-card";

export const metadata = {
  title: "Scheduled Transfers — CoinKeeper",
};

export default async function ScheduledTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const filter = params.filter; // "active", "paused", or undefined (all)

  const where: Record<string, unknown> = { userId: user.id };
  if (filter === "active") where.isActive = true;
  if (filter === "paused") where.isActive = false;

  const schedules = await db.scheduledTransfer.findMany({
    where,
    include: {
      fromAccount: {
        select: { id: true, name: true, currency: true, color: true },
      },
      toAccount: {
        select: { id: true, name: true, currency: true, color: true },
      },
    },
    orderBy: { nextExecution: "asc" },
  });

  const activeCount = schedules.filter((s) => s.isActive).length;
  const pausedCount = schedules.filter((s) => !s.isActive).length;

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Scheduled Transfers
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeCount} active{pausedCount > 0 ? `, ${pausedCount} paused` : ""}
          </p>
        </div>
        <Link
          href="/scheduled-transfers/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
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
          New Schedule
        </Link>
      </div>

      {/* Filters */}
      {schedules.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          {(
            [
              { value: undefined, label: "All" },
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
            ] as const
          ).map((f) => (
            <Link
              key={f.label}
              href={
                f.value
                  ? `/scheduled-transfers?filter=${f.value}`
                  : "/scheduled-transfers"
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      )}

      {/* List */}
      {schedules.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <svg
            className="w-12 h-12 mx-auto text-blue-300 dark:text-blue-700 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M21.015 4.356v4.992"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            No scheduled transfers yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Set up recurring transfers between your accounts.
          </p>
          <Link
            href="/scheduled-transfers/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
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
            Create Schedule
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <ScheduledTransferCard
              key={schedule.id}
              schedule={{
                id: schedule.id,
                amount: schedule.amount,
                currency: schedule.currency,
                rateMode: schedule.rateMode,
                manualRate: schedule.manualRate,
                finalAmount: schedule.finalAmount,
                description: schedule.description,
                frequency: schedule.frequency,
                interval: schedule.interval,
                dayOfWeek: schedule.dayOfWeek,
                dayOfMonth: schedule.dayOfMonth,
                nextExecution: schedule.nextExecution.toISOString(),
                lastExecution: schedule.lastExecution?.toISOString() ?? null,
                endDate: schedule.endDate?.toISOString() ?? null,
                isActive: schedule.isActive,
                executionCount: schedule.executionCount,
                fromAccount: schedule.fromAccount,
                toAccount: schedule.toAccount,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
