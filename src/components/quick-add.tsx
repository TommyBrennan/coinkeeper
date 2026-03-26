"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
}

interface ParsedResult {
  type: "expense" | "income" | "transfer";
  amount: number;
  currency: string;
  description: string;
  source: string | null;
  date: string | null;
  categoryId: string | null;
  categoryName: string | null;
  originalText: string;
}

export function QuickAdd({ accounts }: { accounts: Account[] }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setParsed(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/transactions/parse-natural", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to parse");
        return;
      }

      const data: ParsedResult = await res.json();
      setParsed(data);

      // Auto-select first matching account by currency
      if (accounts.length > 0) {
        const currencyMatch = accounts.find(
          (a) => a.currency === data.currency
        );
        setSelectedAccountId(
          currencyMatch?.id || accounts[0].id
        );
      }
    } catch {
      setError("Failed to parse transaction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!parsed || !selectedAccountId) return;
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        type: parsed.type,
        amount: parsed.amount,
        currency: parsed.currency,
        description: parsed.description,
        categoryId: parsed.categoryId,
        date: parsed.date || new Date().toISOString(),
      };

      if (parsed.type === "expense") {
        body.fromAccountId = selectedAccountId;
      } else if (parsed.type === "income") {
        body.toAccountId = selectedAccountId;
        if (parsed.source) body.source = parsed.source;
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create transaction");
        return;
      }

      setSuccess(
        `${parsed.type === "income" ? "Income" : "Expense"} of ${formatMoney(parsed.amount, parsed.currency)} added!`
      );
      setText("");
      setParsed(null);
      setSelectedAccountId("");
      router.refresh();

      // Auto-clear success after 3s
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to create transaction. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !parsed) {
      e.preventDefault();
      handleParse();
    }
  };

  const handleCancel = () => {
    setParsed(null);
    setError(null);
    inputRef.current?.focus();
  };

  const typeLabel =
    parsed?.type === "income"
      ? "Income"
      : parsed?.type === "transfer"
        ? "Transfer"
        : "Expense";
  const typeColor =
    parsed?.type === "income"
      ? "text-emerald-600 dark:text-emerald-400"
      : parsed?.type === "transfer"
        ? "text-blue-600 dark:text-blue-400"
        : "text-red-600 dark:text-red-400";
  const typeBg =
    parsed?.type === "income"
      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
      : parsed?.type === "transfer"
        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  return (
    <div className="space-y-3">
      {/* Input bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Quick add: "coffee $5.50" or "salary 3000 EUR"'
            disabled={loading}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-transparent disabled:opacity-50"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          onClick={handleParse}
          disabled={!text.trim() || loading}
          className="px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? "Parsing..." : "Parse"}
        </button>
      </div>

      {/* Success message */}
      {success && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <span>✓</span>
          {success}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Parsed result card */}
      {parsed && (
        <div
          className={`rounded-xl border p-4 space-y-3 ${typeBg}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${typeColor}`}
              >
                {typeLabel}
              </span>
              {parsed.categoryName && (
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 rounded-full px-2 py-0.5">
                  {parsed.categoryName}
                </span>
              )}
            </div>
            <span className={`text-lg font-bold tabular-nums ${typeColor}`}>
              {parsed.type === "expense" ? "-" : parsed.type === "income" ? "+" : ""}
              {formatMoney(parsed.amount, parsed.currency)}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {parsed.description}
            {parsed.source && (
              <span className="text-gray-500 dark:text-gray-400">
                {" "}
                · from {parsed.source}
              </span>
            )}
            {parsed.date && (
              <span className="text-gray-500 dark:text-gray-400">
                {" "}
                ·{" "}
                {new Date(parsed.date + "T00:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" }
                )}
              </span>
            )}
          </p>

          {/* Account selector + actions */}
          {parsed.type !== "transfer" && (
            <div className="flex items-center gap-2">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency}) — {formatMoney(acc.balance, acc.currency)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSubmit}
                disabled={!selectedAccountId || submitting || parsed.amount <= 0}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Adding..." : "Confirm"}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Transfer note */}
          {parsed.type === "transfer" && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              For transfers, please use the{" "}
              <a
                href="/transfers/new"
                className="text-emerald-600 dark:text-emerald-400 underline"
              >
                transfer form
              </a>{" "}
              to select source and destination accounts.
            </p>
          )}

          {parsed.amount <= 0 && (
            <p className="text-xs text-red-500">
              Could not detect an amount. Please include a number in your text.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
