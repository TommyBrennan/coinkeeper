/**
 * Shared exchange rate utility.
 * Uses https://api.exchangerate-api.com/v4/latest/{currency} (free, no key).
 */

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
    return rate;
  } catch {
    return null;
  }
}
