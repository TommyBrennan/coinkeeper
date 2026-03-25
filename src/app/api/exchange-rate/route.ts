import { NextRequest, NextResponse } from "next/server";
import { fetchExchangeRate } from "@/lib/exchange-rate";

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
