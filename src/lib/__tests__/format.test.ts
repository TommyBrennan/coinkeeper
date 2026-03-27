import { describe, it, expect } from "vitest";
import { formatMoney, accountTypeLabel, accountTypeIcon } from "../format";

describe("formatMoney", () => {
  it("formats USD amounts correctly", () => {
    expect(formatMoney(25.5, "USD")).toBe("$25.50");
  });

  it("formats EUR amounts correctly", () => {
    expect(formatMoney(100, "EUR")).toBe("€100.00");
  });

  it("formats GBP amounts correctly", () => {
    expect(formatMoney(49.99, "GBP")).toBe("£49.99");
  });

  it("formats zero amount", () => {
    expect(formatMoney(0, "USD")).toBe("$0.00");
  });

  it("formats negative amount", () => {
    expect(formatMoney(-15.5, "USD")).toBe("-$15.50");
  });

  it("formats large amounts with commas", () => {
    const result = formatMoney(1234567.89, "USD");
    expect(result).toBe("$1,234,567.89");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatMoney(10.999, "USD")).toBe("$11.00");
  });

  it("falls back for unknown currency codes", () => {
    const result = formatMoney(50, "XYZ");
    // Intl may use non-breaking space (U+00A0) — normalize for comparison
    expect(result.replace(/\u00A0/g, " ")).toBe("XYZ 50.00");
  });
});

describe("accountTypeLabel", () => {
  it("returns label for cash", () => {
    expect(accountTypeLabel("cash")).toBe("Cash");
  });

  it("returns label for bank", () => {
    expect(accountTypeLabel("bank")).toBe("Bank Account");
  });

  it("returns label for wallet", () => {
    expect(accountTypeLabel("wallet")).toBe("Wallet");
  });

  it("returns label for credit", () => {
    expect(accountTypeLabel("credit")).toBe("Credit Card");
  });

  it("returns raw type for unknown types", () => {
    expect(accountTypeLabel("savings")).toBe("savings");
  });
});

describe("accountTypeIcon", () => {
  it("returns icon for cash", () => {
    expect(accountTypeIcon("cash")).toBe("banknotes");
  });

  it("returns icon for bank", () => {
    expect(accountTypeIcon("bank")).toBe("building-library");
  });

  it("returns default icon for unknown types", () => {
    expect(accountTypeIcon("unknown")).toBe("currency-dollar");
  });
});
