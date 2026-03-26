"use client";

import { useState } from "react";

interface NotificationSettingsProps {
  initialReminderDays: number | null;
}

export function NotificationSettings({
  initialReminderDays,
}: NotificationSettingsProps) {
  const [reminderDays, setReminderDays] = useState(
    initialReminderDays?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const value = reminderDays.trim() ? parseInt(reminderDays, 10) : null;
      if (value !== null && (isNaN(value) || value < 1)) {
        setError("Please enter a positive number of days or leave empty to disable.");
        return;
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderDays: value }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Notifications
      </h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="reminderDays"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Expense logging reminder
          </label>
          <div className="flex items-center gap-3">
            <input
              id="reminderDays"
              type="number"
              min="1"
              step="1"
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
              placeholder="Disabled"
              className="w-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent tabular-nums"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              days without logging
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Get reminded when you haven&apos;t logged any transactions for this many days.
            Leave empty to disable.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );
}
