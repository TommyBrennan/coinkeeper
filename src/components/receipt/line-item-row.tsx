"use client";

import { formatMoney } from "@/lib/format";
import type { Category, LineItem } from "./types";

interface LineItemRowProps {
  item: LineItem;
  index: number;
  currency: string;
  categories: Category[];
  suggestingIndex: number | null;
  onUpdate: (index: number, field: keyof LineItem, value: unknown) => void;
  onRemove: (index: number) => void;
}

export function LineItemRow({
  item,
  index,
  currency,
  categories,
  suggestingIndex,
  onUpdate,
  onRemove,
}: LineItemRowProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
        item.selected
          ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          : "border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-gray-950 opacity-60"
      }`}
    >
      {/* Checkbox */}
      <div className="pt-2">
        <input
          type="checkbox"
          checked={item.selected}
          onChange={(e) => onUpdate(index, "selected", e.target.checked)}
          aria-label={`Include ${item.name || `item ${index + 1}`} in transaction`}
          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
      </div>

      {/* Item details */}
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={item.name}
            onChange={(e) => onUpdate(index, "name", e.target.value)}
            placeholder="Item name"
            aria-label={`Item ${index + 1} name`}
            className="flex-1 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            type="number"
            value={item.quantity}
            onChange={(e) =>
              onUpdate(index, "quantity", parseFloat(e.target.value) || 0)
            }
            min="0"
            step="1"
            aria-label={`Item ${index + 1} quantity`}
            className="w-16 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-gray-100 text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            type="number"
            value={item.unitPrice || ""}
            onChange={(e) =>
              onUpdate(index, "unitPrice", parseFloat(e.target.value) || 0)
            }
            min="0"
            step="0.01"
            placeholder="Unit price"
            aria-label={`Item ${index + 1} unit price`}
            className="w-24 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-gray-100 tabular-nums text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <div className="w-24 px-2 py-1.5 text-sm text-right tabular-nums font-medium text-gray-900 dark:text-gray-100">
            {formatMoney(item.totalPrice, currency)}
          </div>
        </div>

        {/* Category row */}
        <div className="flex items-center gap-2">
          <select
            value={item.categoryId}
            onChange={(e) => onUpdate(index, "categoryId", e.target.value)}
            aria-label={`Category for ${item.name || `item ${index + 1}`}`}
            className="flex-1 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {item.categoryName && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
              AI: {item.categoryName}
            </span>
          )}
          {suggestingIndex === index && (
            <svg
              className="w-3 h-3 text-violet-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            aria-label={`Remove ${item.name || `item ${index + 1}`}`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
