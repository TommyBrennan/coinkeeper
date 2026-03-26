/**
 * Shared exchange rate utility.
 * Uses https://api.exchangerate-api.com/v4/latest/{currency} (free, no key).
 * Persists fetched rates to ExchangeRateHistory for historical tracking.
 */

import { db } from "@/lib/db";

// Cache exchange rates for 10 minutes to avoid excessive API calls
const rateCache = new Map<string, { rate: number; fetchedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function fetchExchangeRate(
  from: string,
  to: string
): Promise<number | null> {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (fromUpper === toUpper) return 1;

  const cacheKey = `${fromUpper}_${toUpper}`;
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.rate;
  }

  try {
    const res = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${fromUpper}`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const rate = data.rates?.[toUpper];
    if (typeof rate !== "number") return null;

    rateCache.set(cacheKey, { rate, fetchedAt: Date.now() });

    // Persist to history (fire and forget, don't block the response)
    persistRateHistory(fromUpper, toUpper, rate).catch(() => {});

    return rate;
  } catch {
    return null;
  }
}

/**
 * Store a rate snapshot in ExchangeRateHistory (one per currency pair per day).
 */
async function persistRateHistory(
  fromCurrency: string,
  toCurrency: string,
  rate: number
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.exchangeRateHistory.upsert({
    where: {
      fromCurrency_toCurrency_date: {
        fromCurrency,
        toCurrency,
        date: today,
      },
    },
    update: { rate },
    create: { fromCurrency, toCurrency, rate, date: today },
  });
}

/**
 * Fetch historical rates for a currency pair over a date range.
 */
export async function getHistoricalRates(
  from: string,
  to: string,
  days: number = 30
): Promise<{ date: string; rate: number }[]> {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const records = await db.exchangeRateHistory.findMany({
    where: {
      fromCurrency: fromUpper,
      toCurrency: toUpper,
      date: { gte: since },
    },
    orderBy: { date: "asc" },
    select: { date: true, rate: true },
  });

  return records.map((r) => ({
    date: r.date.toISOString().split("T")[0],
    rate: r.rate,
  }));
}

/**
 * Seed historical rates by fetching from external API.
 * This fetches the current rate and stores it — useful for bootstrapping history.
 * Called on-demand from the currencies page API.
 */
export async function seedCurrentRate(
  from: string,
  to: string
): Promise<number | null> {
  const rate = await fetchExchangeRate(from, to);
  return rate;
}
