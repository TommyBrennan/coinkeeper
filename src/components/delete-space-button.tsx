"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteSpaceButtonProps {
  spaceId: string;
  spaceName: string;
  hasAccounts: boolean;
}

export function DeleteSpaceButton({
  spaceId,
  spaceName,
  hasAccounts,
}: DeleteSpaceButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/spaces/${spaceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete space");
        return;
      }

      router.push("/spaces");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        disabled={hasAccounts}
        title={
          hasAccounts
            ? "Remove all accounts from this space before deleting"
            : "Delete space"
        }
        className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Delete &ldquo;{spaceName}&rdquo;?
      </span>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loading ? "..." : "Confirm"}
      </button>
      <button
        onClick={() => setShowConfirm(false)}
        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
