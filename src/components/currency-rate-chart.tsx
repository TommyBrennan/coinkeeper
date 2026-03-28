"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const ALL_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY",
  "RUB", "INR", "BRL", "KRW", "MXN", "SGD", "HKD", "NOK",
  "SEK", "DKK", "NZD", "ZAR", "TRY", "PLN", "CZK", "THB", "UAH",
];

const DATE_RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

interface RateDataPoint {
  date: string;
  rate: number;
}

interface HistoryResponse {
  from: string;
  to: string;
  days: number;
  currentRate: number | null;
  history: RateDataPoint[];
}

export function CurrencyRateChart({
  baseCurrency,
  userCurrencies,
}: {
  baseCurrency: string;
  userCurrencies: string[];
}) {
  // Default "from" is base currency, "to" is first user currency that differs
  const defaultTo =
    userCurrencies.find((c) => c !== baseCurrency) ||
    (baseCurrency === "USD" ? "EUR" : "USD");

  const [from, setFrom] = useState(baseCurrency);
  const [to, setTo] = useState(defaultTo);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (from === to) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/exchange-rates/history?from=${from}&to=${to}&days=${days}`
      );
      if (res.ok) {
        const json: HistoryResponse = await res.json();
        setData(json);
      } else {
        setError("Failed to fetch exchange rate data. Please try again.");
        setData(null);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, days]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const swapCurrencies = () => {
    setFrom(to);
    setTo(from);
  };

  const formatRate = (rate: number) => {
    if (rate >= 1000) return rate.toFixed(0);
    if (rate >= 100) return rate.toFixed(2);
    if (rate >= 1) return rate.toFixed(4);
    return rate.toFixed(6);
  };

  // Compute min/max for Y axis domain
  const allRates = data?.history?.map((d) => d.rate) ?? [];
  if (data?.currentRate) allRates.push(data.currentRate);
  const minRate = allRates.length > 0 ? Math.min(...allRates) : 0;
  const maxRate = allRates.length > 0 ? Math.max(...allRates) : 1;
  const padding = (maxRate - minRate) * 0.1 || 0.01;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Exchange Rate Chart
      </h2>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
          >
            {ALL_CURRENCIES.map((cur) => (
              <option key={cur} value={cur} disabled={cur === to}>
                {cur}
              </option>
            ))}
          </select>

          <button
            onClick={swapCurrencies}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Swap currencies"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          </button>

          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
          >
            {ALL_CURRENCIES.map((cur) => (
              <option key={cur} value={cur} disabled={cur === from}>
                {cur}
              </option>
            ))}
          </select>
        </div>

        {/* Date range selector */}
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
          {DATE_RANGES.map((range) => (
            <button
              key={range.days}
              onClick={() => setDays(range.days)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                days === range.days
                  ? "bg-emerald-500 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={fetchHistory}
              className="ml-3 shrink-0 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Current rate display */}
      {from === to ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Select two different currencies to see exchange rates.
        </div>
      ) : data?.currentRate ? (
        <>
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Current rate
            </p>
            <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              1 {from} = {formatRate(data.currentRate)} {to}
            </p>
          </div>

          {/* Chart */}
          {data.history.length > 1 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.history}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-gray-200, #e5e7eb)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val: string) => {
                      const d = new Date(val + "T00:00:00");
                      return d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <YAxis
                    domain={[minRate - padding, maxRate + padding]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val: number) => formatRate(val)}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-gray-50, #f9fafb)",
                      border: "1px solid var(--color-gray-200, #e5e7eb)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(val) => {
                      const d = new Date(String(val) + "T00:00:00");
                      return d.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                    formatter={(value) => [
                      formatRate(Number(value)),
                      `${from}/${to}`,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={data.history.length <= 14}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              <p>Not enough historical data to display a chart yet.</p>
              <p className="mt-1 text-xs">
                Rate data is collected daily as you use the app. Check back in a
                few days to see trends.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Unable to fetch exchange rate for {from}/{to}. Try again later.
        </div>
      )}

      {/* User currencies hint */}
      {userCurrencies.length > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Your account currencies:{" "}
            {userCurrencies.map((c, i) => (
              <button
                key={c}
                onClick={() => {
                  if (c !== from) setTo(c);
                }}
                className="font-mono font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {c}
                {i < userCurrencies.length - 1 ? ", " : ""}
              </button>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
