"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MemberActionsProps {
  spaceId: string;
  memberId: string;
  memberName: string;
  memberRole: string;
  isCurrentUser: boolean;
}

export function MemberActions({
  spaceId,
  memberId,
  memberName,
  memberRole,
  isCurrentUser,
}: MemberActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  async function handleRoleChange(newRole: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to change role");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/members/${memberId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to remove member");
        setShowConfirm(false);
        return;
      }
      if (isCurrentUser) {
        // Removed self — go back to spaces list
        router.push("/spaces");
      } else {
        setShowConfirm(false);
        router.refresh();
      }
    } catch {
      setError("Network error");
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Role selector */}
      <select
        value={memberRole}
        onChange={(e) => handleRoleChange(e.target.value)}
        disabled={loading}
        className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
      >
        <option value="owner">Owner</option>
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>

      {/* Remove button */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-50"
          title={isCurrentUser ? "Leave space" : `Remove ${memberName}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={handleRemove}
            disabled={loading}
            className="px-2 py-1 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : isCurrentUser ? "Leave" : "Remove"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
