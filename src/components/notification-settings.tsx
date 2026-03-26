"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getPushPermission,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";

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

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<string>("default");

  const checkPushStatus = useCallback(async () => {
    const supported = isPushSupported();
    setPushSupported(supported);

    if (supported) {
      setPushPermission(getPushPermission());
      const subscribed = await isPushSubscribed();
      setPushEnabled(subscribed);
    }
  }, []);

  useEffect(() => {
    checkPushStatus();
  }, [checkPushStatus]);

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

  const handlePushToggle = async () => {
    setPushError(null);
    setPushLoading(true);

    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const success = await subscribeToPush();
        if (success) {
          setPushEnabled(true);
        } else {
          setPushError(
            "Notification permission was denied. Please allow notifications in your browser settings."
          );
        }
      }
      setPushPermission(getPushPermission());
    } catch (err) {
      setPushError(
        err instanceof Error ? err.message : "Failed to update push notification settings"
      );
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Notifications
      </h2>

      <div className="space-y-6">
        {/* Push Notifications Toggle */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Push notifications
            </label>
            {pushSupported && (
              <button
                onClick={handlePushToggle}
                disabled={pushLoading || pushPermission === "denied"}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  pushEnabled
                    ? "bg-emerald-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
                role="switch"
                aria-checked={pushEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pushEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            )}
          </div>

          {!pushSupported && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Push notifications are not supported in this browser.
            </p>
          )}

          {pushSupported && pushPermission === "denied" && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Notification permission has been blocked. Please enable notifications in your browser settings to receive push alerts.
            </p>
          )}

          {pushSupported && pushPermission !== "denied" && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {pushEnabled
                ? "You will receive browser push notifications for alerts like low balance, unusual spending, and transfer confirmations."
                : "Enable to receive browser push notifications when you're not actively using CoinKeeper."}
            </p>
          )}

          {pushLoading && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {pushEnabled ? "Disabling..." : "Enabling..."}
            </p>
          )}

          {pushError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {pushError}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-800" />

        {/* Expense Logging Reminder */}
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
