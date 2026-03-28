"use client";

import type { Account, Category } from "./types";
import { PERIOD_PRESETS, TRANSACTION_TYPES } from "./types";
import type { ReportFormState } from "./use-report-form";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors";
const labelClass =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

interface ReportFormProps {
  formState: ReportFormState;
  accounts: Account[];
  categories: Category[];
  onFieldChange: <K extends keyof ReportFormState>(field: K, value: ReportFormState[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}

export function ReportForm({
  formState,
  accounts,
  categories,
  onFieldChange,
  onSubmit,
  onCancel,
  submitLabel,
}: ReportFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formState.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            placeholder="e.g. Monthly Expenses"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Format</label>
          <select
            value={formState.format}
            onChange={(e) => onFieldChange("format", e.target.value)}
            className={inputClass}
          >
            <option value="csv">CSV (download)</option>
            <option value="json">JSON (preview)</option>
            <option value="pdf">PDF (download)</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <input
          type="text"
          value={formState.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          placeholder="Optional description"
          className={inputClass}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filters
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Type
            </label>
            <select
              value={formState.type}
              onChange={(e) => onFieldChange("type", e.target.value)}
              className={inputClass}
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Account
            </label>
            <select
              value={formState.accountId}
              onChange={(e) => onFieldChange("accountId", e.target.value)}
              className={inputClass}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Category
            </label>
            <select
              value={formState.categoryId}
              onChange={(e) => onFieldChange("categoryId", e.target.value)}
              className={inputClass}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Period
            </label>
            <select
              value={formState.periodPreset}
              onChange={(e) => onFieldChange("periodPreset", e.target.value)}
              className={inputClass}
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schedule section */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formState.scheduleEnabled}
              onChange={(e) => onFieldChange("scheduleEnabled", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Auto-generate on schedule
            </span>
          </label>
        </div>

        {formState.scheduleEnabled && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-6">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Frequency
              </label>
              <select
                value={formState.scheduleFrequency}
                onChange={(e) => {
                  onFieldChange("scheduleFrequency", e.target.value);
                  if (e.target.value === "daily") onFieldChange("scheduleDay", null);
                  else if (e.target.value === "weekly") onFieldChange("scheduleDay", 1);
                  else if (e.target.value === "monthly") onFieldChange("scheduleDay", 1);
                }}
                className={inputClass}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {formState.scheduleFrequency === "weekly" && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Day of week
                </label>
                <select
                  value={formState.scheduleDay ?? 1}
                  onChange={(e) => onFieldChange("scheduleDay", parseInt(e.target.value))}
                  className={inputClass}
                >
                  {DAY_NAMES.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formState.scheduleFrequency === "monthly" && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Day of month
                </label>
                <select
                  value={formState.scheduleDay ?? 1}
                  onChange={(e) => onFieldChange("scheduleDay", parseInt(e.target.value))}
                  className={inputClass}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
