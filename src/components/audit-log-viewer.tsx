"use client";

import { useState, useEffect, useCallback } from "react";

interface AuditEntry {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: "Login", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  login_failed: { label: "Failed Login", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  logout: { label: "Logout", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" },
  register: { label: "Registration", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  totp_enabled: { label: "2FA Enabled", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  totp_disabled: { label: "2FA Disabled", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  totp_backup_regenerated: { label: "Backup Codes Regenerated", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  passkey_added: { label: "Passkey Added", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  space_member_added: { label: "Member Added", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  space_member_removed: { label: "Member Removed", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  space_member_role_changed: { label: "Role Changed", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionDetails(entry: AuditEntry): string {
  const meta = entry.metadata;
  if (!meta) return "";

  switch (entry.action) {
    case "login":
      if (meta.method === "totp") return "via authenticator app";
      if (meta.method === "backup_code") return `via backup code (${meta.backupCodesRemaining} remaining)`;
      return "via passkey";
    case "register":
      return meta.email ? `${meta.email}` : "";
    case "space_member_added":
      return meta.inviteeEmail ? `invited ${meta.inviteeEmail} as ${meta.role}` : "";
    case "space_member_removed":
      return "removed from space";
    case "space_member_role_changed":
      return `${meta.previousRole} -> ${meta.newRole}`;
    default:
      return "";
  }
}

export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/audit-log?${params}`);
      if (!res.ok) throw new Error("Failed to load audit log");

      const data = await res.json();
      return data as { entries: AuditEntry[]; nextCursor?: string };
    } catch (err) {
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchEntries()
      .then((data) => {
        setEntries(data.entries);
        setNextCursor(data.nextCursor);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fetchEntries]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchEntries(nextCursor);
      setEntries((prev) => [...prev, ...data.entries]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Security Audit Log
        </h2>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Security Audit Log
      </h2>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No security events recorded yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">
                    Action
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">
                    Details
                  </th>
                  <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const actionInfo = ACTION_LABELS[entry.action] || {
                    label: entry.action,
                    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
                  };
                  const details = getActionDetails(entry);

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${actionInfo.color}`}
                        >
                          {actionInfo.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-300">
                        {details}
                      </td>
                      <td className="py-2.5 text-gray-500 dark:text-gray-400 font-mono text-xs">
                        {entry.ipAddress || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-4 w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
