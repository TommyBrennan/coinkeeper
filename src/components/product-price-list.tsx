"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatMoney } from "@/lib/format";

interface ProductLatestPrice {
  unitPrice: number;
  currency: string;
  merchant: string | null;
  date: string;
}

interface Product {
  id: string;
  name: string;
  normalizedName: string;
  latestPrice: ProductLatestPrice | null;
  observationCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductsResponse {
  data: Product[];
  total: number;
  limit: number;
  offset: number;
}

interface PriceEntry {
  id: string;
  unitPrice: number;
  currency: string;
  merchant: string | null;
  date: string;
  receiptId: string | null;
}

interface PriceStats {
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  merchantCount: number;
  merchants: string[];
}

interface PriceHistoryResponse {
  product: { id: string; name: string; normalizedName: string };
  prices: PriceEntry[];
  stats: PriceStats;
}

export function ProductPriceList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      params.set("limit", "50");

      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error("Failed to load products");
      const result: ProductsResponse = await res.json();
      setProducts(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts("");
  }, [fetchProducts]);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts(value);
    }, 300);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading && products.length === 0) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-6">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => fetchProducts(query)}
          className="mt-2 text-sm text-red-700 dark:text-red-300 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {total} product{total !== 1 ? "s" : ""} found
        {query.trim() ? ` for "${query.trim()}"` : ""}
      </p>

      {/* Product list */}
      {products.length === 0 ? (
        <EmptyState hasQuery={!!query.trim()} />
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div>Product</div>
            <div className="text-right w-28">Latest Price</div>
            <div className="text-right w-24">Store</div>
            <div className="text-right w-20">Records</div>
          </div>

          {/* Product rows */}
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              isExpanded={expandedId === product.id}
              onToggle={() => toggleExpand(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product,
  isExpanded,
  onToggle,
}: {
  product: Product;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {product.name}
          </span>
        </div>
        <div className="text-right w-28">
          {product.latestPrice ? (
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatMoney(
                product.latestPrice.unitPrice,
                product.latestPrice.currency
              )}
            </span>
          ) : (
            <span className="text-sm text-gray-400">--</span>
          )}
        </div>
        <div className="text-right w-24">
          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {product.latestPrice?.merchant || "--"}
          </span>
        </div>
        <div className="text-right w-20">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {product.observationCount}
          </span>
        </div>
      </button>

      {isExpanded && <PriceHistoryPanel productId={product.id} />}
    </div>
  );
}

function PriceHistoryPanel({ productId }: { productId: string }) {
  const [data, setData] = useState<PriceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/products/${productId}/prices`);
        if (!res.ok) throw new Error("Failed to load price history");
        const result: PriceHistoryResponse = await res.json();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-emerald-500 rounded-full animate-spin" />
          Loading price history...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-4 bg-red-50 dark:bg-red-950/20 border-t border-red-100 dark:border-red-900">
        <p className="text-sm text-red-600 dark:text-red-400">
          {error || "No data"}
        </p>
      </div>
    );
  }

  const currency = data.prices[0]?.currency || "USD";
  const showCharts = data.prices.length >= 2;

  return (
    <div className="px-4 py-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800">
      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Average" value={formatMoney(data.stats.avgPrice, currency)} />
        <StatCard label="Lowest" value={formatMoney(data.stats.minPrice, currency)} accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Highest" value={formatMoney(data.stats.maxPrice, currency)} accent="text-red-500 dark:text-red-400" />
        <StatCard
          label="Stores"
          value={
            data.stats.merchantCount > 0
              ? data.stats.merchants.join(", ")
              : "Unknown"
          }
        />
      </div>

      {/* Charts */}
      {showCharts && (
        <PriceTrendCharts prices={data.prices} stats={data.stats} currency={currency} />
      )}

      {/* Price history table */}
      {data.prices.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Store</th>
                <th className="text-right px-3 py-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {data.prices.map((price) => (
                <tr
                  key={price.id}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                    {new Date(price.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {price.merchant || "Unknown"}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatMoney(price.unitPrice, price.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const STORE_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface TrendDataPoint {
  date: string;
  [merchant: string]: number | string | null;
}

interface StoreAvg {
  merchant: string;
  avgPrice: number;
  count: number;
}

function PriceTrendCharts({
  prices,
  stats,
  currency,
}: {
  prices: PriceEntry[];
  stats: PriceStats;
  currency: string;
}) {
  const merchants = useMemo(() => {
    const unique = [...new Set(prices.map((p) => p.merchant || "Unknown"))];
    return unique;
  }, [prices]);

  // Build line chart data: one point per date, with price values keyed by merchant
  const trendData = useMemo(() => {
    // Group prices by date
    const byDate = new Map<string, Map<string, number>>();
    // Sort chronologically
    const sorted = [...prices].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const p of sorted) {
      const dateKey = new Date(p.date).toISOString().split("T")[0];
      const merchant = p.merchant || "Unknown";
      if (!byDate.has(dateKey)) byDate.set(dateKey, new Map());
      // If multiple entries for same store on same date, use the latest
      byDate.get(dateKey)!.set(merchant, p.unitPrice);
    }

    const points: TrendDataPoint[] = [];
    for (const [date, merchantPrices] of byDate) {
      const point: TrendDataPoint = { date };
      for (const m of merchants) {
        point[m] = merchantPrices.get(m) ?? null;
      }
      points.push(point);
    }
    return points;
  }, [prices, merchants]);

  // Build store comparison data
  const storeData = useMemo(() => {
    if (stats.merchantCount < 2) return [];

    const sums = new Map<string, { total: number; count: number }>();
    for (const p of prices) {
      const m = p.merchant || "Unknown";
      const entry = sums.get(m) || { total: 0, count: 0 };
      entry.total += p.unitPrice;
      entry.count += 1;
      sums.set(m, entry);
    }

    const result: StoreAvg[] = [];
    for (const [merchant, { total, count }] of sums) {
      result.push({
        merchant,
        avgPrice: Math.round((total / count) * 100) / 100,
        count,
      });
    }
    return result.sort((a, b) => a.avgPrice - b.avgPrice);
  }, [prices, stats.merchantCount]);

  return (
    <div className="space-y-4 mb-4">
      {/* Price trend line chart */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Price Trend
        </h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb", opacity: 0.3 }}
              tickFormatter={formatDateLabel}
            />
            <YAxis
              tickFormatter={(v) => formatMoney(v, currency)}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={70}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(value) => [formatMoney(Number(value), currency), ""]}
              labelFormatter={(label) => formatDateLabel(label as string)}
              contentStyle={{
                backgroundColor: "var(--color-gray-950, #030712)",
                border: "1px solid var(--color-gray-800, #1f2937)",
                borderRadius: "8px",
                color: "var(--color-gray-100, #f3f4f6)",
                fontSize: "13px",
              }}
            />
            {merchants.length > 1 && (
              <Legend
                verticalAlign="top"
                height={28}
                wrapperStyle={{ fontSize: "12px" }}
              />
            )}
            {merchants.map((merchant, i) => (
              <Line
                key={merchant}
                type="monotone"
                dataKey={merchant}
                name={merchant}
                stroke={STORE_COLORS[i % STORE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: STORE_COLORS[i % STORE_COLORS.length] }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Store comparison bar chart */}
      {storeData.length >= 2 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Average Price by Store
          </h4>
          <ResponsiveContainer width="100%" height={Math.max(120, storeData.length * 44)}>
            <BarChart
              data={storeData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => formatMoney(v, currency)}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb", opacity: 0.3 }}
              />
              <YAxis
                type="category"
                dataKey="merchant"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                formatter={(value) => [formatMoney(Number(value), currency), "Avg Price"]}
                contentStyle={{
                  backgroundColor: "var(--color-gray-950, #030712)",
                  border: "1px solid var(--color-gray-800, #1f2937)",
                  borderRadius: "8px",
                  color: "var(--color-gray-100, #f3f4f6)",
                  fontSize: "13px",
                }}
              />
              <Bar
                dataKey="avgPrice"
                radius={[0, 4, 4, 0]}
                fill="#10b981"
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 px-3 py-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
        {label}
      </p>
      <p
        className={`text-sm font-medium truncate ${
          accent || "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  if (hasQuery) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-8 text-center">
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
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No products match your search
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-8 text-center">
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
          d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 6h.008v.008H6V6Z"
        />
      </svg>
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        No product prices tracked yet
      </p>
      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
        Product prices are automatically extracted from your scanned receipts
      </p>
      <Link
        href="/receipts"
        className="inline-block mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        Scan a receipt to get started
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-4 w-32 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between"
          >
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
