"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatMoney } from "@/lib/format";

interface TrendEntry {
  month: string;
  monthLabel: string;
  income: number;
  expense: number;
  net: number;
}

interface TrendsData {
  data: TrendEntry[];
  currency: string;
}

type Period = "7d" | "30d" | "90d" | "1y" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 days" },
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
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
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

export function IncomeVsExpenseTrends() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("1y");

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

      const res = await fetch(`/api/analytics/trends?${params}`);
      if (!res.ok) throw new Error("Failed to load trends data");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <TrendsLoadingSkeleton />;
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
            Income vs Expenses
          </h2>
          <PeriodSelector period={period} onChange={setPeriod} />
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
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No income or expense data in this period
          </p>
          <a
            href="/transactions"
            className="inline-block mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Add transactions to see trends
          </a>
        </div>
      </div>
    );
  }

  // Compute totals for the summary
  const totalIncome = data.data.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = data.data.reduce((sum, d) => sum + d.expense, 0);
  const netSavings = totalIncome - totalExpense;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Income vs Expenses
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Monthly comparison over time
          </p>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
            Total Income
          </p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
            {formatMoney(totalIncome, data.currency)}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-3">
          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
            Total Expenses
          </p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300">
            {formatMoney(totalExpense, data.currency)}
          </p>
        </div>
        <div
          className={`rounded-lg p-3 border ${
            netSavings >= 0
              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30"
              : "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30"
          }`}
        >
          <p
            className={`text-xs font-medium mb-1 ${
              netSavings >= 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-orange-600 dark:text-orange-400"
            }`}
          >
            Net Savings
          </p>
          <p
            className={`text-lg font-bold ${
              netSavings >= 0
                ? "text-blue-700 dark:text-blue-300"
                : "text-orange-700 dark:text-orange-300"
            }`}
          >
            {netSavings >= 0 ? "+" : ""}
            {formatMoney(netSavings, data.currency)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb", opacity: 0.3 }}
          />
          <YAxis
            tickFormatter={(v) => formatMoney(v, data.currency)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip
            formatter={(value, name) => [
              formatMoney(Number(value), data.currency),
              name === "income" ? "Income" : "Expenses",
            ]}
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: "var(--color-gray-950, #030712)",
              border: "1px solid var(--color-gray-800, #1f2937)",
              borderRadius: "8px",
              color: "var(--color-gray-100, #f3f4f6)",
              fontSize: "13px",
            }}
          />
          <Legend
            formatter={(value) => (value === "income" ? "Income" : "Expenses")}
            wrapperStyle={{ fontSize: "13px" }}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#incomeGradient)"
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#expenseGradient)"
          />
        </AreaChart>
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

function TrendsLoadingSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-5 w-44 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-36 bg-gray-100 dark:bg-gray-900 rounded animate-pulse mt-2" />
        </div>
        <div className="h-7 w-64 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-80 bg-gray-50 dark:bg-gray-900/50 rounded-lg animate-pulse" />
    </div>
  );
}
