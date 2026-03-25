"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  color: string | null;
}

type RateMode = "auto" | "manual" | "final";
type Frequency = "daily" | "weekly" | "monthly";

interface ScheduledTransferData {
  id: string;
  fromAccountId: string;
  toAccountId: string;
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
  endDate: string | null;
  isActive: boolean;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function ScheduledTransferForm({
  schedule,
}: {
  schedule?: ScheduledTransferData;
}) {
  const router = useRouter();
  const isEdit = !!schedule;

  const [fromAccountId, setFromAccountId] = useState(
    schedule?.fromAccountId || ""
  );
  const [toAccountId, setToAccountId] = useState(schedule?.toAccountId || "");
  const [amount, setAmount] = useState(
    schedule ? String(schedule.amount) : ""
  );
  const [description, setDescription] = useState(schedule?.description || "");
  const [frequency, setFrequency] = useState<Frequency>(
    (schedule?.frequency as Frequency) || "monthly"
  );
  const [interval, setInterval] = useState(
    schedule ? String(schedule.interval) : "1"
  );
  const [dayOfWeek, setDayOfWeek] = useState(
    schedule?.dayOfWeek !== null && schedule?.dayOfWeek !== undefined
      ? String(schedule.dayOfWeek)
      : ""
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    schedule?.dayOfMonth !== null && schedule?.dayOfMonth !== undefined
      ? String(schedule.dayOfMonth)
      : ""
  );
  const [rateMode, setRateMode] = useState<RateMode>(
    (schedule?.rateMode as RateMode) || "auto"
  );
  const [manualRate, setManualRate] = useState(
    schedule?.manualRate ? String(schedule.manualRate) : ""
  );
  const [finalAmount, setFinalAmount] = useState(
    schedule?.finalAmount ? String(schedule.finalAmount) : ""
  );
  const [endDate, setEndDate] = useState(
    schedule?.endDate ? schedule.endDate.split("T")[0] : ""
  );
  const [autoRate, setAutoRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/accounts");
        const accs = await res.json();
        setAccounts(accs);
        if (!isEdit && accs.length >= 2) {
          setFromAccountId(accs[0].id);
          setToAccountId(accs[1].id);
        } else if (!isEdit && accs.length === 1) {
          setFromAccountId(accs[0].id);
        }
      } catch {
        setError("Failed to load accounts");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isEdit]);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const isCrossCurrency =
    fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  // Fetch auto exchange rate
  const fetchAutoRate = useCallback(async () => {
    if (!fromAccount || !toAccount) return;
    if (fromAccount.currency === toAccount.currency) {
      setAutoRate(1);
      return;
    }

    setLoadingRate(true);
    try {
      const res = await fetch(
        `/api/exchange-rate?from=${fromAccount.currency}&to=${toAccount.currency}`
      );
      if (res.ok) {
        const data = await res.json();
        setAutoRate(data.rate);
      } else {
        setAutoRate(null);
        setError("Could not fetch exchange rate. Try manual rate instead.");
      }
    } catch {
      setAutoRate(null);
    } finally {
      setLoadingRate(false);
    }
  }, [fromAccount, toAccount]);

  useEffect(() => {
    if (isCrossCurrency && rateMode === "auto") {
      fetchAutoRate();
    } else if (!isCrossCurrency) {
      setAutoRate(1);
    }
  }, [isCrossCurrency, rateMode, fetchAutoRate]);

  // Compute display values
  const parsedAmount = parseFloat(amount) || 0;
  let displayRate: number | null = null;
  let displayToAmount: number | null = null;

  if (!isCrossCurrency) {
    displayRate = 1;
    displayToAmount = parsedAmount;
  } else if (rateMode === "auto" && autoRate !== null) {
    displayRate = autoRate;
    displayToAmount = parsedAmount * autoRate;
  } else if (rateMode === "manual") {
    const r = parseFloat(manualRate);
    if (r > 0) {
      displayRate = r;
      displayToAmount = parsedAmount * r;
    }
  } else if (rateMode === "final") {
    const fa = parseFloat(finalAmount);
    if (fa > 0 && parsedAmount > 0) {
      displayToAmount = fa;
      displayRate = fa / parsedAmount;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedAmount <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    if (!fromAccountId || !toAccountId) {
      setError("Please select both accounts");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("Source and destination must be different accounts");
      return;
    }

    const parsedInterval = parseInt(interval) || 1;
    if (parsedInterval < 1) {
      setError("Interval must be at least 1");
      return;
    }

    const body: Record<string, unknown> = {
      fromAccountId,
      toAccountId,
      amount: parsedAmount,
      rateMode,
      frequency,
      interval: parsedInterval,
      description: description.trim() || null,
    };

    if (frequency === "weekly" && dayOfWeek !== "") {
      body.dayOfWeek = parseInt(dayOfWeek);
    }
    if (frequency === "monthly" && dayOfMonth !== "") {
      body.dayOfMonth = parseInt(dayOfMonth);
    }
    if (endDate) {
      body.endDate = new Date(endDate).toISOString();
    }

    if (isCrossCurrency) {
      if (rateMode === "manual") {
        const r = parseFloat(manualRate);
        if (!r || r <= 0) {
          setError("Please enter a valid exchange rate");
          return;
        }
        body.manualRate = r;
      } else if (rateMode === "final") {
        const fa = parseFloat(finalAmount);
        if (!fa || fa <= 0) {
          setError("Please enter a valid destination amount");
          return;
        }
        body.finalAmount = fa;
      }
    }

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/scheduled-transfers/${schedule.id}`
        : "/api/scheduled-transfers";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/scheduled-transfers");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  if (accounts.length < 2) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          Need at least two accounts
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You need at least two accounts to create a scheduled transfer.
        </p>
        <a
          href="/accounts/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          Create Account
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* From → To accounts */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
        <div>
          <label
            htmlFor="from-account"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            From
          </label>
          <select
            id="from-account"
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            disabled={isEdit}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-center pb-0.5">
          <svg
            className="w-5 h-5 text-gray-400 rotate-90 sm:rotate-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </div>

        <div>
          <label
            htmlFor="to-account"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            To
          </label>
          <select
            id="to-account"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            disabled={isEdit}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Amount{fromAccount ? ` (${fromAccount.currency})` : ""}
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums text-lg"
          autoFocus
        />
      </div>

      {/* Exchange rate section — only for cross-currency */}
      {isCrossCurrency && (
        <div className="space-y-4 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exchange Rate Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "auto", label: "Auto Rate" },
                  { value: "manual", label: "Manual Rate" },
                  { value: "final", label: "Final Amount" },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setRateMode(mode.value)}
                  className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                    rateMode === mode.value
                      ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {rateMode === "auto" && (
            <div className="flex items-center gap-2 text-sm">
              {loadingRate ? (
                <span className="text-gray-500 dark:text-gray-400">
                  Fetching rate...
                </span>
              ) : autoRate !== null ? (
                <span className="text-gray-700 dark:text-gray-300">
                  1 {fromAccount?.currency} ={" "}
                  <strong className="tabular-nums">
                    {autoRate.toFixed(4)}
                  </strong>{" "}
                  {toAccount?.currency}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">
                  Rate unavailable — try manual mode
                </span>
              )}
              <button
                type="button"
                onClick={fetchAutoRate}
                className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
              >
                Refresh
              </button>
            </div>
          )}

          {rateMode === "manual" && (
            <div>
              <label
                htmlFor="manual-rate"
                className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
              >
                1 {fromAccount?.currency} = ? {toAccount?.currency}
              </label>
              <input
                id="manual-rate"
                type="number"
                step="0.0001"
                min="0.0001"
                value={manualRate}
                onChange={(e) => setManualRate(e.target.value)}
                placeholder="0.0000"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
              />
            </div>
          )}

          {rateMode === "final" && (
            <div>
              <label
                htmlFor="final-amount"
                className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
              >
                Amount received in {toAccount?.currency}
              </label>
              <input
                id="final-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={finalAmount}
                onChange={(e) => setFinalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
              />
            </div>
          )}

          {/* Conversion preview */}
          {parsedAmount > 0 && displayToAmount !== null && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {parsedAmount.toFixed(2)} {fromAccount?.currency}
              </span>
              <svg
                className="w-4 h-4 text-gray-400 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
              <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                {displayToAmount.toFixed(2)} {toAccount?.currency}
              </span>
              {displayRate !== null && (
                <span className="text-xs text-gray-400 ml-auto tabular-nums">
                  @{displayRate.toFixed(4)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule Configuration */}
      <div className="space-y-4 p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Schedule
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Frequency */}
          <div>
            <label
              htmlFor="frequency"
              className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              Frequency
            </label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Interval */}
          <div>
            <label
              htmlFor="interval"
              className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              Every N{" "}
              {frequency === "daily"
                ? "days"
                : frequency === "weekly"
                  ? "weeks"
                  : "months"}
            </label>
            <input
              id="interval"
              type="number"
              min="1"
              max="365"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent tabular-nums"
            />
          </div>
        </div>

        {/* Day of week for weekly */}
        {frequency === "weekly" && (
          <div>
            <label
              htmlFor="day-of-week"
              className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              Day of week
            </label>
            <select
              id="day-of-week"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Any day</option>
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={String(i)}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Day of month for monthly */}
        {frequency === "monthly" && (
          <div>
            <label
              htmlFor="day-of-month"
              className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              Day of month
            </label>
            <select
              id="day-of-month"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Default</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* End date */}
        <div>
          <label
            htmlFor="end-date"
            className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
          >
            End date (optional)
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Description (optional)
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Monthly rent, Weekly savings"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Schedule"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
