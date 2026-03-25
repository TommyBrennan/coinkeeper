"use client";

import { formatMoney } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface IncomeTransaction {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  source: string | null;
  date: string;
  isRecurring: boolean;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  toAccount: {
    id: string;
    name: string;
    currency: string;
    color: string | null;
  } | null;
}

const categoryEmojis: Record<string, string> = {
  briefcase: "\uD83D\uDCBC",
  laptop: "\uD83D\uDCBB",
  "trending-up": "\uD83D\uDCC8",
  gift: "\uD83C\uDF81",
  star: "\u2B50",
  home: "\uD83C\uDFE0",
  percent: "\uD83D\uDCCA",
  "rotate-ccw": "\uD83D\uDD04",
  "more-horizontal": "\u2022\u2022\u2022",
};

export function IncomeCard({
  transaction,
}: {
  transaction: IncomeTransaction;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm("Delete this income entry? The account balance will be reverted.")
    )
      return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const icon = transaction.category?.icon
    ? categoryEmojis[transaction.category.icon] || "\uD83D\uDCB0"
    : "\uD83D\uDCB0";

  const dateStr = new Date(transaction.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
      {/* Category icon */}
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-sm"
        style={{
          backgroundColor: transaction.category?.color
            ? `${transaction.category.color}20`
            : "rgb(209 250 229)",
          color: transaction.category?.color || "rgb(5 150 105)",
        }}
      >
        {icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {transaction.source ||
              transaction.description ||
              transaction.category?.name ||
              "Income"}
          </h3>
          {transaction.isRecurring && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              Recurring
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {transaction.category?.name || "Uncategorized"}
          {transaction.toAccount && (
            <>
              {" \u00B7 "}
              {transaction.toAccount.name}
            </>
          )}
          {" \u00B7 "}
          {dateStr}
          {transaction.source && transaction.description && (
            <>
              {" \u00B7 "}
              {transaction.description}
            </>
          )}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          +{formatMoney(transaction.amount, transaction.currency)}
        </p>
      </div>

      {/* Delete button */}
      <div className="opacity-0 group-hover:opacity-100 absolute top-1.5 right-1.5 transition-all">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          title="Delete income entry"
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
