import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CurrencyRateChart } from "@/components/currency-rate-chart";
import { BaseCurrencySettings } from "@/components/base-currency-settings";

export default async function CurrenciesPage() {
  const user = await requireUser();

  // Get user's base currency and unique currencies from their accounts
  const [fullUser, accounts] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { baseCurrency: true },
    }),
    db.account.findMany({
      where: { userId: user.id, isArchived: false },
      select: { currency: true },
      distinct: ["currency"],
    }),
  ]);

  const baseCurrency = fullUser?.baseCurrency ?? "USD";
  const userCurrencies = [...new Set(accounts.map((a) => a.currency))];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Currencies
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Track exchange rates and manage your base currency preference.
      </p>

      <div className="space-y-8">
        {/* Base currency preference */}
        <BaseCurrencySettings initialBaseCurrency={baseCurrency} />

        {/* Exchange rate chart */}
        <CurrencyRateChart
          baseCurrency={baseCurrency}
          userCurrencies={userCurrencies}
        />
      </div>
    </div>
  );
}
