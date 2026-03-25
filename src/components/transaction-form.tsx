"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  color: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface AISuggestion {
  categoryId: string | null;
  suggestedName: string | null;
  confidence: "high" | "medium" | "low";
  isNew: boolean;
}

export function TransactionForm() {
  const router = useRouter();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // AI suggestion state
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [accRes, catRes] = await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/categories"),
        ]);
        const accs = await accRes.json();
        const cats = await catRes.json();
        setAccounts(accs);
        setCategories(cats);
        if (accs.length > 0) setAccountId(accs[0].id);
      } catch {
        setError("Failed to load accounts and categories");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const fetchSuggestion = useCallback(async (desc: string, amt: string) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setSuggesting(true);
    setSuggestion(null);

    try {
      const body: Record<string, unknown> = { description: desc };
      const parsedAmt = parseFloat(amt);
      if (parsedAmt && parsedAmt > 0) {
        body.amount = parsedAmt;
      }

      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        setSuggesting(false);
        return;
      }

      const data: AISuggestion = await res.json();

      // Only show suggestions with a category and reasonable confidence
      if (data.categoryId && data.confidence !== "low") {
        setSuggestion(data);

        // If a new category was created, refresh the categories list
        if (data.isNew) {
          const catRes = await fetch("/api/categories", {
            signal: controller.signal,
          });
          if (catRes.ok) {
            const cats = await catRes.json();
            setCategories(cats);
          }
        }
      }
    } catch (err) {
      // Ignore abort errors — they're expected when cancelling
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      // Silent failure for other errors
    } finally {
      if (!controller.signal.aborted) {
        setSuggesting(false);
      }
    }
  }, []);

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescription(value);
      setSuggestionDismissed(false);

      // Clear pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Cancel in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      const trimmed = value.trim();
      if (trimmed.length < 3) {
        setSuggestion(null);
        setSuggesting(false);
        return;
      }

      // Debounce 500ms
      debounceRef.current = setTimeout(() => {
        fetchSuggestion(trimmed, amount);
      }, 500);
    },
    [amount, fetchSuggestion]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const acceptSuggestion = useCallback(() => {
    if (suggestion?.categoryId) {
      setCategoryId(suggestion.categoryId);
      setSuggestion(null);
    }
  }, [suggestion]);

  const dismissSuggestion = useCallback(() => {
    setSuggestion(null);
    setSuggestionDismissed(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    if (!accountId) {
      setError("Please select an account");
      return;
    }

    const selectedAccount = accounts.find((a) => a.id === accountId);

    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: parsedAmount,
          currency: selectedAccount?.currency || "USD",
          description: description.trim() || null,
          date: new Date(date).toISOString(),
          categoryId: categoryId || null,
          fromAccountId: type === "expense" ? accountId : null,
          toAccountId: type === "income" ? accountId : null,
        }),
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

  // Find the suggested category name for display
  const suggestedCategoryName =
    suggestion?.suggestedName ||
    categories.find((c) => c.id === suggestion?.categoryId)?.name ||
    null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          No accounts yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You need at least one account to record transactions.
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

      {/* Type toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                type === t
                  ? t === "expense"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                    : "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400"
              }`}
            >
              {t === "expense" ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                  </svg>
                  Expense
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                  </svg>
                  Income
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Amount
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent tabular-nums text-lg"
          autoFocus
        />
      </div>

      {/* Account */}
      <div>
        <label
          htmlFor="account"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {type === "expense" ? "From Account" : "To Account"}
        </label>
        <select
          id="account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Description
        </label>
        <div className="relative">
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="What was this for?"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {suggesting && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="w-4 h-4 text-violet-500 animate-spin"
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
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestion chip */}
      {suggestion && suggestedCategoryName && !suggestionDismissed && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 animate-in fade-in duration-200">
          <svg
            className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
            />
          </svg>
          <span className="text-sm text-violet-700 dark:text-violet-300">
            AI suggests:{" "}
            <span className="font-medium">{suggestedCategoryName}</span>
          </span>
          <span
            className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${
              suggestion.confidence === "high"
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
            }`}
          >
            {suggestion.confidence}
          </span>
          {suggestion.isNew && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
              new
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={acceptSuggestion}
              className="text-xs px-2.5 py-1 rounded-md bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={dismissSuggestion}
              className="text-xs px-2.5 py-1 rounded-md border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Category */}
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Category
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
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
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className={`px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            type === "expense"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {submitting
            ? "Saving..."
            : type === "expense"
              ? "Add Expense"
              : "Add Income"}
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
