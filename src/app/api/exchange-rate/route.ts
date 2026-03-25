import { NextRequest, NextResponse } from "next/server";

// Cache exchange rates for 10 minutes to avoid excessive API calls
const rateCache = new Map<string, { rate: number; fetchedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchExchangeRate(
  from: string,
  to: string
): Promise<number | null> {
  const cacheKey = `${from}_${to}`;
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.rate;
  }

  try {
    // Using free exchange rate API (no key required)
    const res = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const rate = data.rates?.[to.toUpperCase()];
    if (typeof rate !== "number") return null;

    rateCache.set(cacheKey, { rate, fetchedAt: Date.now() });
    return rate;
  } catch {
    return null;
  }
}

// GET /api/exchange-rate?from=USD&to=EUR
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Both 'from' and 'to' currency codes are required" },
      { status: 400 }
    );
  }

  if (from.toUpperCase() === to.toUpperCase()) {
    return NextResponse.json({ from, to, rate: 1 });
  }

  const rate = await fetchExchangeRate(from, to);
  if (rate === null) {
    return NextResponse.json(
      { error: `Could not fetch exchange rate for ${from} → ${to}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    rate,
  });
}
