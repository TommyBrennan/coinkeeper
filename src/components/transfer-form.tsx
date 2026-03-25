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

export function TransferForm() {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [rateMode, setRateMode] = useState<RateMode>("auto");
  const [manualRate, setManualRate] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
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
        if (accs.length >= 2) {
          setFromAccountId(accs[0].id);
          setToAccountId(accs[1].id);
        } else if (accs.length === 1) {
          setFromAccountId(accs[0].id);
        }
      } catch {
        setError("Failed to load accounts");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const isCrossCurrency =
    fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  // Fetch auto exchange rate when accounts change
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

    // Build the request body
    const body: Record<string, unknown> = {
      type: "transfer",
      amount: parsedAmount,
      currency: fromAccount?.currency || "USD",
      description: description.trim() || null,
      date: new Date(date).toISOString(),
      fromAccountId,
      toAccountId,
    };

    if (isCrossCurrency) {
      if (rateMode === "auto" && autoRate) {
        body.exchangeRate = autoRate;
        body.toAmount = parsedAmount * autoRate;
      } else if (rateMode === "manual") {
        const r = parseFloat(manualRate);
        if (!r || r <= 0) {
          setError("Please enter a valid exchange rate");
          return;
        }
        body.exchangeRate = r;
      } else if (rateMode === "final") {
        const fa = parseFloat(finalAmount);
        if (!fa || fa <= 0) {
          setError("Please enter a valid destination amount");
          return;
        }
        body.toAmount = fa;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/transactions");
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
          You need at least two accounts to make a transfer.
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
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency} {a.balance.toFixed(2)})
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
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency} {a.balance.toFixed(2)})
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

      {/* Description & Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Description
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this transfer for?"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Transferring..." : "Transfer"}
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
