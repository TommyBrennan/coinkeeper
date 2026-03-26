import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ScheduledTransferForm } from "@/components/scheduled-transfer-form";

export const metadata = {
  title: "Edit Scheduled Transfer — CoinKeeper",
};

export default async function EditScheduledTransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const schedule = await db.scheduledTransfer.findUnique({
    where: { id },
  });

  if (!schedule || schedule.userId !== user.id) {
    notFound();
  }

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Edit Schedule
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Modify the recurring transfer schedule.
        </p>
      </div>
      <ScheduledTransferForm
        schedule={{
          id: schedule.id,
          fromAccountId: schedule.fromAccountId,
          toAccountId: schedule.toAccountId,
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
          endDate: schedule.endDate?.toISOString() ?? null,
          isActive: schedule.isActive,
        }}
      />
    </main>
  );
}
