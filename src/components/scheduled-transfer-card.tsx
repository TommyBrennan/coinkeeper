"use client";

import { formatMoney } from "@/lib/format";
import { formatFrequency } from "@/lib/schedule";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ScheduledTransferData {
  id: string;
  amount: number;
  currency: string;
  rateMode: string;
  manualRate: number | null;
  finalAmount: number | null;
  description: string | null;
  frequency: string;
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  nextExecution: string;
  lastExecution: string | null;
  endDate: string | null;
  isActive: boolean;
  executionCount: number;
  fromAccount: {
    id: string;
    name: string;
    currency: string;
    color: string | null;
  };
  toAccount: {
    id: string;
    name: string;
    currency: string;
    color: string | null;
  };
}

export function ScheduledTransferCard({
  schedule,
}: {
  schedule: ScheduledTransferData;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this scheduled transfer? This cannot be undone."))
      return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/scheduled-transfers/${schedule.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsToggling(true);
    try {
      const res = await fetch(`/api/scheduled-transfers/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !schedule.isActive }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsToggling(false);
    }
  };

  const freqLabel = formatFrequency(
    schedule.frequency,
    schedule.interval,
    schedule.dayOfWeek,
    schedule.dayOfMonth
  );

  const nextDate = new Date(schedule.nextExecution).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  const isCrossCurrency =
    schedule.fromAccount.currency !== schedule.toAccount.currency;

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-xl border p-3 transition-colors cursor-pointer ${
        schedule.isActive
          ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-800"
          : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-60"
      }`}
      onClick={() => router.push(`/scheduled-transfers/${schedule.id}/edit`)}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-sm"
        style={{
          backgroundColor: schedule.fromAccount.color
            ? `${schedule.fromAccount.color}20`
            : "rgb(219 234 254)",
          color: schedule.fromAccount.color || "rgb(37 99 235)",
        }}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M21.015 4.356v4.992"
          />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {schedule.fromAccount.name} → {schedule.toAccount.name}
          </h3>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
              schedule.isActive
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}
          >
            {schedule.isActive ? "Active" : "Paused"}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {freqLabel}
          {" · "}
          Next: {nextDate}
          {schedule.description && (
            <>
              {" · "}
              {schedule.description}
            </>
          )}
          {isCrossCurrency && (
            <>
              {" · "}
              {schedule.rateMode === "auto"
                ? "Auto rate"
                : schedule.rateMode === "manual"
                  ? "Manual rate"
                  : "Final amount"}
            </>
          )}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">
          {formatMoney(schedule.amount, schedule.currency)}
        </p>
        {schedule.executionCount > 0 && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
            {schedule.executionCount}x executed
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="opacity-0 group-hover:opacity-100 absolute top-1.5 right-1.5 transition-all flex items-center gap-0.5">
        <button
          onClick={handleToggleActive}
          disabled={isToggling}
          className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
          title={schedule.isActive ? "Pause schedule" : "Resume schedule"}
        >
          {schedule.isActive ? (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25v13.5m-7.5-13.5v13.5"
              />
            </svg>
          ) : (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
              />
            </svg>
          )}
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          title="Delete scheduled transfer"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
