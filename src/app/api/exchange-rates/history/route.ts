import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getHistoricalRates, fetchExchangeRate } from "@/lib/exchange-rate";

/**
 * GET /api/exchange-rates/history?from=USD&to=EUR&days=30
 *
 * Returns historical exchange rate data for charting.
 * Also fetches the current rate to ensure today's data is recorded.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const from = searchParams.get("from")?.toUpperCase();
  const to = searchParams.get("to")?.toUpperCase();
  const days = parseInt(searchParams.get("days") || "30", 10);

  if (!from || !to) {
    return NextResponse.json(
      { error: "Both 'from' and 'to' currency parameters are required" },
      { status: 400 }
    );
  }

  if (from.length !== 3 || to.length !== 3) {
    return NextResponse.json(
      { error: "Currency codes must be 3 letters" },
      { status: 400 }
    );
  }

  if (isNaN(days) || days < 1 || days > 365) {
    return NextResponse.json(
      { error: "Days must be between 1 and 365" },
      { status: 400 }
    );
  }

  // Fetch current rate to ensure today's data is captured
  const currentRate = await fetchExchangeRate(from, to);

  // Get historical data
  const history = await getHistoricalRates(from, to, days);

  return NextResponse.json({
    from,
    to,
    days,
    currentRate,
    history,
  });
}
