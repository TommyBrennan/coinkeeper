"use client";

import { useState } from "react";

interface TelegramLinkCardProps {
  linked: boolean;
  username: string | null;
  linkedAt: string | null;
  botConfigured: boolean;
}

export function TelegramLinkCard({
  linked,
  username,
  linkedAt,
  botConfigured,
}: TelegramLinkCardProps) {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState(linked);
  const [linkedUsername, setLinkedUsername] = useState(username);

  async function generateCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/link-code", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate code");
        return;
      }
      const data = await res.json();
      setLinkCode(data.code);
    } catch {
      setError("Failed to generate code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function unlinkTelegram() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/status", { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to unlink. Please try again.");
        return;
      }
      setIsLinked(false);
      setLinkedUsername(null);
      setLinkCode(null);
    } catch {
      setError("Failed to unlink. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Telegram
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Link your Telegram account for quick expense tracking
          </p>
        </div>
      </div>

      {!botConfigured && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-300">
          Telegram bot is not configured yet. The bot token needs to be set up by
          the administrator.
        </div>
      )}

      {botConfigured && isLinked && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span className="font-medium">Telegram linked</span>
          </div>
          {linkedUsername && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connected as <span className="font-medium">@{linkedUsername}</span>
            </p>
          )}
          {linkedAt && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Linked on {new Date(linkedAt).toLocaleDateString()}
            </p>
          )}
          <button
            onClick={unlinkTelegram}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            {loading ? "Unlinking..." : "Unlink Telegram"}
          </button>
        </div>
      )}

      {botConfigured && !isLinked && !linkCode && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Generate a one-time code and send it to the CoinKeeper bot on Telegram
            to link your account.
          </p>
          <button
            onClick={generateCode}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Link Code"}
          </button>
        </div>
      )}

      {botConfigured && !isLinked && linkCode && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Your link code:
            </p>
            <p className="text-3xl font-mono font-bold tracking-widest text-gray-900 dark:text-gray-100">
              {linkCode}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Expires in 10 minutes
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Open Telegram and send this to the CoinKeeper bot:
            </p>
            <code className="block mt-2 text-sm font-mono text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/40 rounded px-3 py-1.5">
              /link {linkCode}
            </code>
          </div>
          <button
            onClick={generateCode}
            disabled={loading}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Generate new code
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
