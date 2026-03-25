"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "bank", label: "Bank Account", icon: "🏦" },
  { value: "wallet", label: "Wallet", icon: "👛" },
  { value: "credit", label: "Credit Card", icon: "💳" },
];

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY",
  "RUB", "INR", "BRL", "KRW", "MXN", "SGD", "HKD", "NOK",
  "SEK", "DKK", "NZD", "ZAR", "TRY", "PLN", "CZK", "THB",
];

interface AccountFormProps {
  initialData?: {
    id: string;
    name: string;
    type: string;
    currency: string;
    balance: number;
    icon: string | null;
    color: string | null;
  };
}

export function AccountForm({ initialData }: AccountFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState(initialData?.type ?? "cash");
  const [currency, setCurrency] = useState(initialData?.currency ?? "USD");
  const [balance, setBalance] = useState(
    initialData?.balance?.toString() ?? "0"
  );
  const [color, setColor] = useState(initialData?.color ?? "#10b981");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Account name is required");
      return;
    }

    setSubmitting(true);
    try {
      const url = isEditing
        ? `/api/accounts/${initialData.id}`
        : "/api/accounts";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          currency,
          balance: parseFloat(balance) || 0,
          color,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/accounts");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Account Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Main Checking, Cash Wallet"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
          autoFocus
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Account Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-colors ${
                type === t.value
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Currency & Balance */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="currency"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="balance"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {isEditing ? "Balance" : "Initial Balance"}
          </label>
          <input
            id="balance"
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent tabular-nums"
          />
        </div>
      </div>

      {/* Color */}
      <div>
        <label
          htmlFor="color"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Color
        </label>
        <div className="flex items-center gap-3">
          <input
            id="color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {color}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Saving..."
            : isEditing
              ? "Update Account"
              : "Create Account"}
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
