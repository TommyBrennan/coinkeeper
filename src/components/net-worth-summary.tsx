"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/format";

const POPULAR_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "RUB",
  "UAH",
];

const STORAGE_KEY = "coinkeeper-base-currency";

interface BreakdownItem {
  currency: string;
  originalAmount: number;
  convertedAmount: number | null;
  exchangeRate: number | null;
}

interface NetWorthData {
  baseCurrency: string;
  totalNetWorth: number;
  breakdown: BreakdownItem[];
  accountCount: number;
  hasConversionErrors: boolean;
}

export function NetWorthSummary() {
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && POPULAR_CURRENCIES.includes(saved)) {
      setBaseCurrency(saved);
    }
  }, []);

  const fetchNetWorth = useCallback(async (currency: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/net-worth?baseCurrency=${currency}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently fail — we'll show a fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetWorth(baseCurrency);
  }, [baseCurrency, fetchNetWorth]);

  const handleCurrencyChange = (newCurrency: string) => {
    setBaseCurrency(newCurrency);
    localStorage.setItem(STORAGE_KEY, newCurrency);
  };

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-9 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasMultipleCurrencies = data.breakdown.length > 1;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      {/* Header row with label and currency selector */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Net Worth
        </p>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          )}
          <select
            value={baseCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="text-xs font-medium bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-300 cursor-pointer focus:ring-2 focus:ring-emerald-500"
          >
            {POPULAR_CURRENCIES.map((cur) => (
              <option key={cur} value={cur}>
                {cur}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Total net worth */}
      <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
        {formatMoney(data.totalNetWorth, data.baseCurrency)}
      </p>

      {/* Account count */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Across {data.accountCount} account{data.accountCount !== 1 && "s"}
        {hasMultipleCurrencies && ` · ${data.breakdown.length} currencies`}
      </p>

      {/* Conversion warning */}
      {data.hasConversionErrors && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
          <span>⚠️</span>
          Some currencies could not be converted — shown separately below
        </p>
      )}

      {/* Currency breakdown toggle */}
      {hasMultipleCurrencies && (
        <div className="mt-4">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showBreakdown ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
            Currency breakdown
          </button>

          {showBreakdown && (
            <div className="mt-3 space-y-2">
              {data.breakdown.map((item) => (
                <div
                  key={item.currency}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-gray-500 dark:text-gray-400 w-8">
                      {item.currency}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 tabular-nums">
                      {formatMoney(item.originalAmount, item.currency)}
                    </span>
                  </div>
                  <div className="text-right">
                    {item.convertedAmount !== null ? (
                      <span className="text-gray-500 dark:text-gray-400 tabular-nums text-xs">
                        {item.currency !== data.baseCurrency && (
                          <>
                            ≈ {formatMoney(item.convertedAmount, data.baseCurrency)}
                            <span className="ml-1 text-gray-400 dark:text-gray-500">
                              @{item.exchangeRate?.toFixed(4)}
                            </span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-amber-500 text-xs">
                        Rate unavailable
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
