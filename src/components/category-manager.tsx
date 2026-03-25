"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface CategoryItem {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  transactionCount: number;
}

export function CategoryManager({
  initialCategories,
}: {
  initialCategories: CategoryItem[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startRename = useCallback((cat: CategoryItem) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setError(null);
  }, []);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setEditName("");
    setError(null);
  }, []);

  const submitRename = useCallback(
    async (id: string) => {
      if (!editName.trim()) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/categories/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim() }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to rename category");
          return;
        }

        const updated = await res.json();
        setCategories((prev) =>
          prev
            .map((c) => (c.id === id ? { ...c, name: updated.name } : c))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingId(null);
        setEditName("");
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [editName]
  );

  const deleteCategory = useCallback(
    async (id: string, name: string) => {
      if (
        !confirm(
          `Delete "${name}"? Transactions using this category will become uncategorized.`
        )
      ) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/categories/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to delete category");
          return;
        }

        setCategories((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const startMerge = useCallback(() => {
    setMergeMode(true);
    setMergeSourceId(null);
    setMergeTargetId(null);
    setError(null);
  }, []);

  const cancelMerge = useCallback(() => {
    setMergeMode(false);
    setMergeSourceId(null);
    setMergeTargetId(null);
    setError(null);
  }, []);

  const submitMerge = useCallback(async () => {
    if (!mergeSourceId || !mergeTargetId) return;

    const source = categories.find((c) => c.id === mergeSourceId);
    const target = categories.find((c) => c.id === mergeTargetId);

    if (
      !confirm(
        `Merge "${source?.name}" into "${target?.name}"? All transactions from "${source?.name}" will be reassigned, and "${source?.name}" will be deleted.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/categories/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: mergeSourceId,
          targetId: mergeTargetId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to merge categories");
        return;
      }

      const result = await res.json();

      // Update local state: remove source, update target count
      setCategories((prev) => {
        const sourceCount =
          prev.find((c) => c.id === mergeSourceId)?.transactionCount || 0;
        return prev
          .filter((c) => c.id !== mergeSourceId)
          .map((c) =>
            c.id === mergeTargetId
              ? { ...c, transactionCount: c.transactionCount + sourceCount }
              : c
          );
      });

      setMergeMode(false);
      setMergeSourceId(null);
      setMergeTargetId(null);
      router.refresh();

      // Brief success notification via error state (re-using for simplicity)
      setError(null);
      // Could add a toast here
      console.log(
        `Merged: ${result.transactionsMoved} transactions moved from "${result.deletedCategory}" to "${result.targetCategory}"`
      );
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [mergeSourceId, mergeTargetId, categories, router]);

  const isDefaultCategory = (cat: CategoryItem) =>
    cat.icon !== null && cat.color !== null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center gap-2">
        {!mergeMode ? (
          <button
            type="button"
            onClick={startMerge}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
            Merge Categories
          </button>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 w-full">
            <svg
              className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
              />
            </svg>
            <div className="flex-1 text-sm text-amber-800 dark:text-amber-200">
              {!mergeSourceId
                ? "Select the source category (will be deleted)"
                : !mergeTargetId
                  ? "Now select the target category (will keep)"
                  : "Ready to merge"}
            </div>
            <div className="flex items-center gap-2">
              {mergeSourceId && mergeTargetId && (
                <button
                  type="button"
                  onClick={submitMerge}
                  disabled={loading}
                  className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? "Merging..." : "Confirm Merge"}
                </button>
              )}
              <button
                type="button"
                onClick={cancelMerge}
                className="px-3 py-1 rounded-md border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category list */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No categories yet. They will be created when you add transactions.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {categories.map((cat) => {
              const isSource = mergeSourceId === cat.id;
              const isTarget = mergeTargetId === cat.id;

              return (
                <li
                  key={cat.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    mergeMode
                      ? isSource
                        ? "bg-red-50 dark:bg-red-900/10"
                        : isTarget
                          ? "bg-emerald-50 dark:bg-emerald-900/10"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      : ""
                  }`}
                  onClick={() => {
                    if (!mergeMode) return;
                    if (!mergeSourceId) {
                      setMergeSourceId(cat.id);
                    } else if (cat.id !== mergeSourceId && !mergeTargetId) {
                      setMergeTargetId(cat.id);
                    } else if (isSource) {
                      setMergeSourceId(null);
                      setMergeTargetId(null);
                    } else if (isTarget) {
                      setMergeTargetId(null);
                    }
                  }}
                >
                  {/* Color dot */}
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: cat.color || "#9ca3af",
                    }}
                  />

                  {/* Name (editable) */}
                  <div className="flex-1 min-w-0">
                    {editingId === cat.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitRename(cat.id);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {cat.name}
                        </span>
                        {!isDefaultCategory(cat) && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-medium">
                            AI
                          </span>
                        )}
                        {isSource && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium">
                            source (delete)
                          </span>
                        )}
                        {isTarget && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                            target (keep)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Transaction count */}
                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                    {cat.transactionCount}{" "}
                    {cat.transactionCount === 1 ? "txn" : "txns"}
                  </span>

                  {/* Actions (hidden in merge mode) */}
                  {!mergeMode && editingId !== cat.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startRename(cat)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Rename"
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
                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(cat.id, cat.name)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
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
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
        {categories.length} categories total
        {categories.filter((c) => !isDefaultCategory(c)).length > 0 &&
          ` (${categories.filter((c) => !isDefaultCategory(c)).length} AI-created)`}
      </div>
    </div>
  );
}
