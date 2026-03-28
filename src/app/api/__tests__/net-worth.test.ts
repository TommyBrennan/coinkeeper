/**
 * Integration tests for /api/net-worth route.
 * Tests net worth calculation with multi-currency support.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockUser, mockAccountModel, mockFetchExchangeRate } = vi.hoisted(() => {
  const createModel = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(null),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
  });

  return {
    mockUser: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      reminderDays: null,
      baseCurrency: "USD",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    mockAccountModel: createModel(),
    mockFetchExchangeRate: vi.fn().mockResolvedValue(1.0),
  };
});

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    account: mockAccountModel,
  },
}));

vi.mock("@/lib/exchange-rate", () => ({
  fetchExchangeRate: mockFetchExchangeRate,
}));

// ── Import handlers after mocking ────────────────────────────────────────────

import { GET } from "../net-worth/route";

// ── Test data factories ──────────────────────────────────────────────────────

function createAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: "acc-1",
    userId: "user-1",
    name: "Checking",
    type: "bank",
    currency: "USD",
    balance: 1000,
    isArchived: false,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("/api/net-worth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/net-worth", () => {
    it("returns net worth for single-currency accounts", async () => {
      const accounts = [
        createAccount({ id: "acc-1", balance: 1000 }),
        createAccount({ id: "acc-2", balance: 500, name: "Savings" }),
      ];
      mockAccountModel.findMany.mockResolvedValue(accounts);

      const req = createRequest("http://localhost:3000/api/net-worth");
      const res = await GET(req);
      const { status, data } = await parseResponse<{
        baseCurrency: string;
        totalNetWorth: number;
        breakdown: Array<{
          currency: string;
          originalAmount: number;
          convertedAmount: number;
          exchangeRate: number;
        }>;
        accountCount: number;
        hasConversionErrors: boolean;
      }>(res);

      expect(status).toBe(200);
      expect(data.baseCurrency).toBe("USD");
      expect(data.totalNetWorth).toBe(1500);
      expect(data.accountCount).toBe(2);
      expect(data.hasConversionErrors).toBe(false);
      expect(data.breakdown).toHaveLength(1);
      expect(data.breakdown[0].currency).toBe("USD");
      expect(data.breakdown[0].originalAmount).toBe(1500);
      expect(data.breakdown[0].exchangeRate).toBe(1);
    });

    it("converts multi-currency accounts", async () => {
      const accounts = [
        createAccount({ id: "acc-1", balance: 1000, currency: "USD" }),
        createAccount({ id: "acc-2", balance: 800, currency: "EUR" }),
      ];
      mockAccountModel.findMany.mockResolvedValue(accounts);
      mockFetchExchangeRate.mockResolvedValue(1.1); // EUR -> USD rate

      const req = createRequest("http://localhost:3000/api/net-worth");
      const res = await GET(req);
      const { status, data } = await parseResponse<{
        totalNetWorth: number;
        breakdown: Array<{
          currency: string;
          originalAmount: number;
          convertedAmount: number;
          exchangeRate: number;
        }>;
        hasConversionErrors: boolean;
      }>(res);

      expect(status).toBe(200);
      expect(data.totalNetWorth).toBe(1000 + 800 * 1.1);
      expect(data.breakdown).toHaveLength(2);
      expect(data.hasConversionErrors).toBe(false);

      // Base currency comes first
      const usdBreakdown = data.breakdown.find((b) => b.currency === "USD");
      const eurBreakdown = data.breakdown.find((b) => b.currency === "EUR");

      expect(usdBreakdown?.originalAmount).toBe(1000);
      expect(usdBreakdown?.exchangeRate).toBe(1);
      expect(eurBreakdown?.originalAmount).toBe(800);
      expect(eurBreakdown?.convertedAmount).toBeCloseTo(880, 2);
      expect(eurBreakdown?.exchangeRate).toBe(1.1);
    });

    it("uses custom baseCurrency from query param", async () => {
      const accounts = [
        createAccount({ id: "acc-1", balance: 1000, currency: "EUR" }),
      ];
      mockAccountModel.findMany.mockResolvedValue(accounts);

      const req = createRequest(
        "http://localhost:3000/api/net-worth?baseCurrency=EUR"
      );
      const res = await GET(req);
      const { status, data } = await parseResponse<{
        baseCurrency: string;
        totalNetWorth: number;
      }>(res);

      expect(status).toBe(200);
      expect(data.baseCurrency).toBe("EUR");
      expect(data.totalNetWorth).toBe(1000);
      // No exchange rate call needed since account currency matches base
      expect(mockFetchExchangeRate).not.toHaveBeenCalled();
    });

    it("handles exchange rate failures gracefully", async () => {
      const accounts = [
        createAccount({ id: "acc-1", balance: 1000, currency: "USD" }),
        createAccount({ id: "acc-2", balance: 500, currency: "XYZ" }),
      ];
      mockAccountModel.findMany.mockResolvedValue(accounts);
      mockFetchExchangeRate.mockResolvedValue(null); // Rate not available

      const req = createRequest("http://localhost:3000/api/net-worth");
      const res = await GET(req);
      const { status, data } = await parseResponse<{
        totalNetWorth: number;
        hasConversionErrors: boolean;
        breakdown: Array<{
          currency: string;
          convertedAmount: number | null;
          exchangeRate: number | null;
        }>;
      }>(res);

      expect(status).toBe(200);
      expect(data.hasConversionErrors).toBe(true);
      expect(data.totalNetWorth).toBe(1000); // Only USD counted

      const xyzBreakdown = data.breakdown.find((b) => b.currency === "XYZ");
      expect(xyzBreakdown?.convertedAmount).toBeNull();
      expect(xyzBreakdown?.exchangeRate).toBeNull();
    });

    it("returns zero net worth when no accounts", async () => {
      mockAccountModel.findMany.mockResolvedValue([]);

      const req = createRequest("http://localhost:3000/api/net-worth");
      const res = await GET(req);
      const { status, data } = await parseResponse<{
        totalNetWorth: number;
        accountCount: number;
        breakdown: unknown[];
      }>(res);

      expect(status).toBe(200);
      expect(data.totalNetWorth).toBe(0);
      expect(data.accountCount).toBe(0);
      expect(data.breakdown).toHaveLength(0);
    });

    it("excludes archived accounts", async () => {
      mockAccountModel.findMany.mockResolvedValue([]);

      const req = createRequest("http://localhost:3000/api/net-worth");
      await GET(req);

      expect(mockAccountModel.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", isArchived: false },
      });
    });

    it("uppercases baseCurrency query param", async () => {
      mockAccountModel.findMany.mockResolvedValue([]);

      const req = createRequest(
        "http://localhost:3000/api/net-worth?baseCurrency=eur"
      );
      const res = await GET(req);
      const { data } = await parseResponse<{ baseCurrency: string }>(res);

      expect(data.baseCurrency).toBe("EUR");
    });

    it("aggregates balances from same-currency accounts", async () => {
      const accounts = [
        createAccount({ id: "acc-1", balance: 1000, currency: "USD" }),
        createAccount({ id: "acc-2", balance: 2000, currency: "USD" }),
        createAccount({ id: "acc-3", balance: 500, currency: "USD" }),
      ];
      mockAccountModel.findMany.mockResolvedValue(accounts);

      const req = createRequest("http://localhost:3000/api/net-worth");
      const res = await GET(req);
      const { data } = await parseResponse<{
        totalNetWorth: number;
        breakdown: Array<{ currency: string; originalAmount: number }>;
      }>(res);

      expect(data.totalNetWorth).toBe(3500);
      expect(data.breakdown).toHaveLength(1);
      expect(data.breakdown[0].originalAmount).toBe(3500);
    });

    it("returns 401 when unauthenticated", async () => {
      const { requireApiUser } = await import("@/lib/auth");
      vi.mocked(requireApiUser).mockResolvedValueOnce({
        user: null as never,
        error: true as never,
      });

      const req = createRequest("http://localhost:3000/api/net-worth");
      const res = await GET(req);
      const { status } = await parseResponse(res);

      expect(status).toBe(401);
    });
  });
});
