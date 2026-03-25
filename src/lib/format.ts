/**
 * Format a monetary amount with currency symbol.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unknown currency codes
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Get a display label for an account type.
 */
export function accountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    cash: "Cash",
    bank: "Bank Account",
    wallet: "Wallet",
    credit: "Credit Card",
  };
  return labels[type] || type;
}

/**
 * Get an icon for an account type.
 */
export function accountTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    cash: "banknotes",
    bank: "building-library",
    wallet: "wallet",
    credit: "credit-card",
  };
  return icons[type] || "currency-dollar";
}
