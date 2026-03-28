/**
 * Integration tests for /api/analytics/balance-history route.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────

const { mockUser, mockAccountModel, mockTransactionModel } = vi.hoisted(() => {
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
    mockTransactionModel: createModel(),
  };
});

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
}));

vi.mock("@/lib/space-context", () => ({
  getSpaceContext: vi
    .fn()
    .mockResolvedValue({ spaceId: null, spaceName: null, role: null }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    account: mockAccountModel,
    transaction: mockTransactionModel,
  },
}));

// ── Import handlers after mocking ────────────────────────────────────────

import { GET } from "../analytics/balance-history/route";

// ── Tests ────────────────────────────────────────────────────────────────

describe("GET /api/analytics/balance-history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty data when user has no accounts", async () => {
    mockAccountModel.findMany.mockResolvedValue([]);

    const req = createRequest("http://localhost:3000/api/analytics/balance-history");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ data: unknown[]; accounts: unknown[]; currency: string }>(res);

    expect(status).toBe(200);
    expect(data.data).toEqual([]);
    expect(data.accounts).toEqual([]);
    expect(data.currency).toBe("USD");
  });

  it("returns balance history with transactions", async () => {
    const accounts = [
      { id: "acc-1", name: "Checking", currency: "USD", balance: 500 },
    ];
    mockAccountModel.findMany.mockResolvedValue(accounts);

    const transactions = [
      { type: "income", amount: 1000, toAmount: null, date: new Date("2026-03-01"), fromAccountId: null, toAccountId: "acc-1" },
      { type: "expense", amount: 200, toAmount: null, date: new Date("2026-03-05"), fromAccountId: "acc-1", toAccountId: null },
    ];

    // Filtered transactions (same as all since no date filter)
    mockTransactionModel.findMany
      .mockResolvedValueOnce(transactions)  // filtered
      .mockResolvedValueOnce(transactions); // all transactions

    const req = createRequest("http://localhost:3000/api/analytics/balance-history");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ data: { date: string; total: number }[]; accounts: unknown[]; currency: string }>(res);

    expect(status).toBe(200);
    expect(data.data.length).toBeGreaterThan(0);
    expect(data.accounts).toEqual([{ id: "acc-1", name: "Checking", currency: "USD" }]);
    expect(data.currency).toBe("USD");
  });

  it("filters by accountId query parameter", async () => {
    const accounts = [
      { id: "acc-1", name: "Checking", currency: "USD", balance: 500 },
    ];
    mockAccountModel.findMany.mockResolvedValue(accounts);
    mockTransactionModel.findMany.mockResolvedValue([]);

    const req = createRequest("http://localhost:3000/api/analytics/balance-history?accountId=acc-1");
    await GET(req);

    expect(mockAccountModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "acc-1",
          userId: "user-1",
        }),
      })
    );
  });

  it("uses primary currency from accounts", async () => {
    const accounts = [
      { id: "acc-1", name: "Account 1", currency: "EUR", balance: 100 },
      { id: "acc-2", name: "Account 2", currency: "EUR", balance: 200 },
      { id: "acc-3", name: "Account 3", currency: "USD", balance: 50 },
    ];
    mockAccountModel.findMany.mockResolvedValue(accounts);
    mockTransactionModel.findMany.mockResolvedValue([]);

    const req = createRequest("http://localhost:3000/api/analytics/balance-history");
    const res = await GET(req);
    const { data } = await parseResponse<{ currency: string }>(res);

    expect(data.currency).toBe("EUR");
  });

  it("returns 401 for unauthenticated requests", async () => {
    const { requireApiUser } = await import("@/lib/auth");
    vi.mocked(requireApiUser).mockResolvedValueOnce({
      user: null as never,
      error: true,
    });

    const req = createRequest("http://localhost:3000/api/analytics/balance-history");
    const res = await GET(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });

  it("handles date range filters", async () => {
    const accounts = [
      { id: "acc-1", name: "Checking", currency: "USD", balance: 500 },
    ];
    mockAccountModel.findMany.mockResolvedValue(accounts);
    mockTransactionModel.findMany.mockResolvedValue([]);

    const req = createRequest(
      "http://localhost:3000/api/analytics/balance-history?from=2026-03-01&to=2026-03-31"
    );
    await GET(req);

    // Verify filtered transactions query includes date filter
    expect(mockTransactionModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
      })
    );
  });
});
