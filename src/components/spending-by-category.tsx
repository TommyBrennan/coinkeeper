"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatMoney } from "@/lib/format";

interface CategorySpending {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  total: number;
  count: number;
  percentage: number;
}

interface SpendingData {
  data: CategorySpending[];
  total: number;
  currency: string;
  transactionCount: number;
}

type Period = "7d" | "30d" | "90d" | "1y" | "all";
type ChartType = "pie" | "bar";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];

const DEFAULT_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#e11d48", "#a855f7", "#22c55e", "#eab308",
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

export function SpendingByCategory() {
  const [data, setData] = useState<SpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [chartType, setChartType] = useState<ChartType>("pie");

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

      const res = await fetch(`/api/analytics/spending-by-category?${params}`);
      if (!res.ok) throw new Error("Failed to load analytics data");
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
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-6">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-sm text-red-700 dark:text-red-300 underline"
        >
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
            Spending by Category
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
              d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No expenses recorded in this period
          </p>
          <a
            href="/transactions"
            className="inline-block mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Add your first expense
          </a>
        </div>
      </div>
    );
  }

  const chartData = data.data.map((cat, i) => ({
    ...cat,
    fill: cat.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Spending by Category
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {data.transactionCount} transaction{data.transactionCount !== 1 ? "s" : ""} totaling{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {formatMoney(data.total, data.currency)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector period={period} onChange={setPeriod} />
          <ChartToggle chartType={chartType} onChange={setChartType} />
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        {chartType === "pie" ? (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name || ""} ${percent ? Math.round(percent * 1000) / 10 : 0}%`
                }
                labelLine={true}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={entry.fill} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatMoney(Number(value), data.currency)}
                contentStyle={{
                  backgroundColor: "var(--color-gray-950, #030712)",
                  border: "1px solid var(--color-gray-800, #1f2937)",
                  borderRadius: "8px",
                  color: "var(--color-gray-100, #f3f4f6)",
                  fontSize: "13px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" tickFormatter={(v) => formatMoney(v, data.currency)} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => formatMoney(Number(value), data.currency)}
                contentStyle={{
                  backgroundColor: "var(--color-gray-950, #030712)",
                  border: "1px solid var(--color-gray-800, #1f2937)",
                  borderRadius: "8px",
                  color: "var(--color-gray-100, #f3f4f6)",
                  fontSize: "13px",
                }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category breakdown table */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          Breakdown
        </h3>
        <div className="space-y-2">
          {data.data.map((cat, i) => (
            <div
              key={cat.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: cat.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
                  }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {cat.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {cat.count} transaction{cat.count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatMoney(cat.total, data.currency)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {cat.percentage}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
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

function ChartToggle({
  chartType,
  onChange,
}: {
  chartType: ChartType;
  onChange: (t: ChartType) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => onChange("pie")}
        className={`p-1.5 transition-colors ${
          chartType === "pie"
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        }`}
        title="Pie chart"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
        </svg>
      </button>
      <button
        onClick={() => onChange("bar")}
        className={`p-1.5 transition-colors ${
          chartType === "bar"
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        }`}
        title="Bar chart"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 dark:bg-gray-900 rounded animate-pulse mt-2" />
        </div>
        <div className="h-7 w-64 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
      </div>
      <div className="flex items-center justify-center h-80">
        <div className="w-48 h-48 rounded-full border-[24px] border-gray-100 dark:border-gray-800 animate-pulse" />
      </div>
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
