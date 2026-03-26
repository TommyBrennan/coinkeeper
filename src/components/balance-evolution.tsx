"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatMoney } from "@/lib/format";

interface BalanceEntry {
  date: string;
  total: number;
}

interface AccountOption {
  id: string;
  name: string;
  currency: string;
}

interface BalanceData {
  data: BalanceEntry[];
  accounts: AccountOption[];
  currency: string;
}

type Period = "30d" | "90d" | "1y" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];

function getDateRange(period: Period): { from: string; to: string } | null {
  if (period === "all") return null;
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now);

  switch (period) {
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
    case "1y":
      from.setFullYear(from.getFullYear() - 1);
      break;
  }

  return { from: from.toISOString(), to };
}

export function BalanceEvolution() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("90d");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const range = getDateRange(period);
      const params = new URLSearchParams();
      if (range) {
        params.set("from", range.from);
        params.set("to", range.to);
      }
      if (selectedAccount !== "all") {
        params.set("accountId", selectedAccount);
      }

      const res = await fetch(`/api/analytics/balance-history?${params}`);
      if (!res.ok) throw new Error("Failed to load balance data");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [period, selectedAccount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <BalanceLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-6">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button onClick={fetchData} className="mt-2 text-sm text-red-700 dark:text-red-300 underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Balance Evolution
          </h2>
        </div>
        <div className="text-center py-12">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No balance data available
          </p>
          <a
            href="/accounts"
            className="inline-block mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Create an account to get started
          </a>
        </div>
      </div>
    );
  }

  // Determine current balance and change
  const latestBalance = data.data[data.data.length - 1]?.total || 0;
  const earliestBalance = data.data[0]?.total || 0;
  const balanceChange = latestBalance - earliestBalance;
  const changePercent =
    earliestBalance !== 0 ? Math.round((balanceChange / Math.abs(earliestBalance)) * 1000) / 10 : 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Balance Evolution
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Current:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {formatMoney(latestBalance, data.currency)}
              </span>
            </span>
            {balanceChange !== 0 && (
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  balanceChange >= 0
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                }`}
              >
                {balanceChange >= 0 ? "+" : ""}
                {changePercent}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.accounts.length > 1 && (
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm px-2.5 py-1 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All accounts</option>
              {data.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          )}
          <PeriodSelector period={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb", opacity: 0.3 }}
            tickFormatter={formatDateLabel}
          />
          <YAxis
            tickFormatter={(v) => formatMoney(v, data.currency)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip
            formatter={(value) => [formatMoney(Number(value), data.currency), "Balance"]}
            labelFormatter={(label) => formatDateLabel(label as string)}
            contentStyle={{
              backgroundColor: "var(--color-gray-950, #030712)",
              border: "1px solid var(--color-gray-800, #1f2937)",
              borderRadius: "8px",
              color: "var(--color-gray-100, #f3f4f6)",
              fontSize: "13px",
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#3b82f6" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PeriodSelector({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-2.5 py-1 text-xs font-medium transition-colors ${
            period === p.value
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function BalanceLoadingSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-100 dark:bg-gray-900 rounded animate-pulse mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-28 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
          <div className="h-7 w-48 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-72 bg-gray-50 dark:bg-gray-900/50 rounded-lg animate-pulse" />
    </div>
  );
}
