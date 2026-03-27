"use client";

import { useState, useEffect, useCallback } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  priority: string;
  metadata: string | null;
  createdAt: string;
}

interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  low_balance: {
    label: "Low Balance",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
    color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
  },
  unusual_spending: {
    label: "Unusual Spending",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
    color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
  },
  expense_reminder: {
    label: "Reminder",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
    ),
    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
  },
  transfer_confirmation: {
    label: "Transfer",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
  },
  system: {
    label: "System",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
      </svg>
    ),
    color: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50",
  },
};

const PRIORITY_DOT: Record<string, { color: string; label: string }> = {
  high: { color: "bg-red-500", label: "High priority" },
  medium: { color: "bg-yellow-500", label: "Medium priority" },
  low: { color: "bg-green-500", label: "Low priority" },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string, read: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;

  return (
    <div
      className={`group flex items-start gap-3 p-4 rounded-xl border transition-colors ${
        notification.read
          ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/30"
      }`}
    >
      {/* Type icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`} aria-hidden="true">
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {!notification.read && (() => {
            const priority = PRIORITY_DOT[notification.priority] || PRIORITY_DOT.medium;
            return (
              <>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${priority.color}`}
                  aria-hidden="true"
                />
                <span className="sr-only">{priority.label}</span>
              </>
            );
          })()}
          <h3 className={`text-sm font-semibold truncate ${notification.read ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>
            {notification.title}
          </h3>
        </div>
        <p className={`text-sm leading-relaxed ${notification.read ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-400"}`}>
          {notification.message}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {config.label}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {timeAgo(notification.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={() => onMarkRead(notification.id, !notification.read)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={notification.read ? "Mark as unread" : "Mark as read"}
        >
          {notification.read ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.839 2.51-4.66-2.51m0 0-1.023-.55a2.25 2.25 0 0 0-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V8.844a2.25 2.25 0 0 1 1.183-1.981l7.5-4.039a2.25 2.25 0 0 1 2.134 0l7.5 4.039a2.25 2.25 0 0 1 1.183 1.98V19.5Z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          )}
        </button>
        <button
          onClick={() => onDelete(notification.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label="Delete notification"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading notifications">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationCenter() {
  const [data, setData] = useState<NotificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async (showUnreadOnly: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (showUnreadOnly) params.set("unreadOnly", "true");
      params.set("limit", "50");

      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`);
      const json: NotificationResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(filter === "unread");
  }, [filter, fetchNotifications]);

  const handleMarkRead = async (id: string, read: boolean) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      if (!res.ok) throw new Error("Failed to update");

      // Optimistic update
      setData((prev) => {
        if (!prev) return prev;
        const updated = prev.notifications.map((n) =>
          n.id === id ? { ...n, read } : n
        );
        const unreadCount = updated.filter((n) => !n.read).length;
        return { ...prev, notifications: updated, unreadCount };
      });
    } catch {
      // Refetch on error
      fetchNotifications(filter === "unread");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      // Optimistic update
      setData((prev) => {
        if (!prev) return prev;
        const remaining = prev.notifications.filter((n) => n.id !== id);
        const unreadCount = remaining.filter((n) => !n.read).length;
        return { ...prev, notifications: remaining, total: prev.total - 1, unreadCount };
      });
    } catch {
      fetchNotifications(filter === "unread");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" }),
      });
      if (!res.ok) throw new Error("Failed to update");

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: prev.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        };
      });
    } catch {
      fetchNotifications(filter === "unread");
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1" role="tablist" aria-label="Notification filters">
          <button
            onClick={() => setFilter("all")}
            role="tab"
            aria-selected={filter === "all"}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            role="tab"
            aria-selected={filter === "unread"}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === "unread"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Unread
            {data && data.unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                {data.unreadCount}
              </span>
            )}
          </button>
        </div>

        {data && data.unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Error */}
      {!loading && error && (
        <div role="alert" className="text-center py-12 border-2 border-dashed border-red-200 dark:border-red-800/50 rounded-xl">
          <svg className="w-12 h-12 mx-auto text-red-300 dark:text-red-600 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            Failed to load notifications
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchNotifications(filter === "unread")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.notifications.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            {filter === "unread" ? "All caught up!" : "No notifications yet"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filter === "unread"
              ? "You have no unread notifications."
              : "Notifications about your financial activity will appear here."}
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && !error && data && data.notifications.length > 0 && (
        <div className="space-y-2">
          {data.notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
