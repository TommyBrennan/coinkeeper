"use client";

import { useState } from "react";

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY",
  "RUB", "INR", "BRL", "KRW", "MXN", "SGD", "HKD", "NOK",
  "SEK", "DKK", "NZD", "ZAR", "TRY", "PLN", "CZK", "THB", "UAH",
];

export function BaseCurrencySettings({
  initialBaseCurrency,
}: {
  initialBaseCurrency: string;
}) {
  const [baseCurrency, setBaseCurrency] = useState(initialBaseCurrency);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = async (newCurrency: string) => {
    setBaseCurrency(newCurrency);
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseCurrency: newCurrency }),
      });

      if (res.ok) {
        // Also update localStorage for backward compatibility with NetWorthSummary
        localStorage.setItem("coinkeeper-base-currency", newCurrency);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // Revert on error
      setBaseCurrency(initialBaseCurrency);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Base Currency
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Your preferred currency for net worth display and conversions.
      </p>

      <div className="flex items-center gap-3">
        <select
          value={baseCurrency}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
        >
          {CURRENCIES.map((cur) => (
            <option key={cur} value={cur}>
              {cur}
            </option>
          ))}
        </select>

        {saving && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            Saving...
          </span>
        )}

        {saved && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
