import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { fetchExchangeRate } from "@/lib/exchange-rate";

export async function GET(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const baseCurrency = (
    request.nextUrl.searchParams.get("baseCurrency") || "USD"
  ).toUpperCase();

  try {
    const accounts = await db.account.findMany({
      where: { userId: user.id, isArchived: false },
    });

    // Group balances by currency
    const balanceByCurrency: Record<string, number> = {};
    for (const account of accounts) {
      const cur = account.currency.toUpperCase();
      balanceByCurrency[cur] = (balanceByCurrency[cur] || 0) + account.balance;
    }

    // Convert each currency to base currency
    const breakdown: Array<{
      currency: string;
      originalAmount: number;
      convertedAmount: number | null;
      exchangeRate: number | null;
    }> = [];

    let totalNetWorth = 0;
    let hasConversionErrors = false;

    for (const [currency, amount] of Object.entries(balanceByCurrency)) {
      if (currency === baseCurrency) {
        breakdown.push({
          currency,
          originalAmount: amount,
          convertedAmount: amount,
          exchangeRate: 1,
        });
        totalNetWorth += amount;
      } else {
        const rate = await fetchExchangeRate(currency, baseCurrency);
        if (rate !== null) {
          const converted = amount * rate;
          breakdown.push({
            currency,
            originalAmount: amount,
            convertedAmount: converted,
            exchangeRate: rate,
          });
          totalNetWorth += converted;
        } else {
          breakdown.push({
            currency,
            originalAmount: amount,
            convertedAmount: null,
            exchangeRate: null,
          });
          hasConversionErrors = true;
        }
      }
    }

    // Sort: base currency first, then alphabetical
    breakdown.sort((a, b) => {
      if (a.currency === baseCurrency) return -1;
      if (b.currency === baseCurrency) return 1;
      return a.currency.localeCompare(b.currency);
    });

    return NextResponse.json({
      baseCurrency,
      totalNetWorth,
      breakdown,
      accountCount: accounts.length,
      hasConversionErrors,
    });
  } catch (error) {
    console.error("Net worth calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate net worth" },
      { status: 500 }
    );
  }
}
