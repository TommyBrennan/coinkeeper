/**
 * Integration tests for /api/analytics routes.
 * Tests spending-by-category and trends endpoints.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────

const { mockUser, mockTransactionModel, mockAccountModel } = vi.hoisted(() => {
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
    mockTransactionModel: createModel(),
    mockAccountModel: createModel(),
  };
});

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
  requireUser: vi.fn().mockResolvedValue(mockUser),
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
}));

vi.mock("@/lib/space-context", () => ({
  getSpaceContext: vi
    .fn()
    .mockResolvedValue({ spaceId: null, spaceName: null, role: null }),
  getSpaceAccountIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db", () => ({
  db: {
    transaction: mockTransactionModel,
    account: mockAccountModel,
  },
}));

// ── Import handlers after mocking ────────────────────────────────────────

import { GET as getSpendingByCategory } from "../analytics/spending-by-category/route";
import { GET as getTrends } from "../analytics/trends/route";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext, getSpaceAccountIds } from "@/lib/space-context";

// ── Spending by Category Tests ───────────────────────────────────────────

describe("GET /api/analytics/spending-by-category", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
    vi.mocked(getSpaceContext).mockResolvedValue({
      spaceId: null,
      spaceName: null,
      role: null,
    });
  });

  it("returns empty data when no transactions exist", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([]);

    const request = createRequest("/api/analytics/spending-by-category");
    const response = await getSpendingByCategory(request);
    const { status, data } = await parseResponse<{
      data: unknown[];
      total: number;
      currency: string;
      transactionCount: number;
    }>(response);

    expect(status).toBe(200);
    expect(data.data).toHaveLength(0);
    expect(data.total).toBe(0);
    expect(data.transactionCount).toBe(0);
  });

  it("aggregates expenses by category", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([
      {
        amount: 50,
        currency: "USD",
        category: { id: "cat-1", name: "Food", color: "#ff0000", icon: null },
      },
      {
        amount: 30,
        currency: "USD",
        category: { id: "cat-1", name: "Food", color: "#ff0000", icon: null },
      },
      {
        amount: 20,
        currency: "USD",
        category: {
          id: "cat-2",
          name: "Transport",
          color: "#00ff00",
          icon: null,
        },
      },
    ]);

    const request = createRequest("/api/analytics/spending-by-category");
    const response = await getSpendingByCategory(request);
    const { status, data } = await parseResponse<{
      data: Array<{
        id: string;
        name: string;
        total: number;
        count: number;
        percentage: number;
      }>;
      total: number;
      currency: string;
      transactionCount: number;
    }>(response);

    expect(status).toBe(200);
    expect(data.data).toHaveLength(2);
    expect(data.total).toBe(100);
    expect(data.transactionCount).toBe(3);

    // Sorted by total descending
    expect(data.data[0].name).toBe("Food");
    expect(data.data[0].total).toBe(80);
    expect(data.data[0].count).toBe(2);
    expect(data.data[0].percentage).toBe(80);

    expect(data.data[1].name).toBe("Transport");
    expect(data.data[1].total).toBe(20);
    expect(data.data[1].count).toBe(1);
    expect(data.data[1].percentage).toBe(20);
  });

  it("handles uncategorized transactions", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([
      { amount: 15, currency: "USD", category: null },
      {
        amount: 25,
        currency: "USD",
        category: { id: "cat-1", name: "Food", color: null, icon: null },
      },
    ]);

    const request = createRequest("/api/analytics/spending-by-category");
    const response = await getSpendingByCategory(request);
    const { data } = await parseResponse<{
      data: Array<{ id: string; name: string; total: number }>;
    }>(response);

    expect(data.data).toHaveLength(2);
    const uncategorized = data.data.find((d) => d.name === "Uncategorized");
    expect(uncategorized).toBeDefined();
    expect(uncategorized!.total).toBe(15);
  });

  it("filters by date range", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([]);

    const request = createRequest(
      "/api/analytics/spending-by-category?from=2026-01-01&to=2026-03-31"
    );
    await getSpendingByCategory(request);

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

  it("filters by accountId", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([]);

    const request = createRequest(
      "/api/analytics/spending-by-category?accountId=acc-1"
    );
    await getSpendingByCategory(request);

    expect(mockTransactionModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fromAccountId: "acc-1",
        }),
      })
    );
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValueOnce({
      user: null as never,
      error: true,
    });

    const request = createRequest("/api/analytics/spending-by-category");
    const response = await getSpendingByCategory(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("uses space account IDs when in a space", async () => {
    vi.mocked(getSpaceContext).mockResolvedValueOnce({
      spaceId: "space-1",
      spaceName: "Family",
      role: "owner",
    });
    vi.mocked(getSpaceAccountIds).mockResolvedValueOnce([
      "acc-1",
      "acc-2",
    ]);
    mockTransactionModel.findMany.mockResolvedValueOnce([]);

    const request = createRequest("/api/analytics/spending-by-category");
    await getSpendingByCategory(request);

    expect(mockTransactionModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fromAccountId: { in: ["acc-1", "acc-2"] },
        }),
      })
    );
  });

  it("returns empty data when space has no accounts", async () => {
    vi.mocked(getSpaceContext).mockResolvedValueOnce({
      spaceId: "space-1",
      spaceName: "Family",
      role: "owner",
    });
    vi.mocked(getSpaceAccountIds).mockResolvedValueOnce([]);

    const request = createRequest("/api/analytics/spending-by-category");
    const response = await getSpendingByCategory(request);
    const { data } = await parseResponse<{
      data: unknown[];
      total: number;
    }>(response);

    expect(data.data).toHaveLength(0);
    expect(data.total).toBe(0);
  });

  it("determines primary currency from most common in transactions", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([
      { amount: 10, currency: "EUR", category: null },
      { amount: 20, currency: "EUR", category: null },
      { amount: 5, currency: "USD", category: null },
    ]);

    const request = createRequest("/api/analytics/spending-by-category");
    const response = await getSpendingByCategory(request);
    const { data } = await parseResponse<{ currency: string }>(response);

    expect(data.currency).toBe("EUR");
  });
});

// ── Trends Tests ─────────────────────────────────────────────────────────

describe("GET /api/analytics/trends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiUser).mockResolvedValue({
      user: mockUser,
      error: false,
    });
    vi.mocked(getSpaceContext).mockResolvedValue({
      spaceId: null,
      spaceName: null,
      role: null,
    });
  });

  it("returns empty data when no transactions exist", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([]);

    const request = createRequest("/api/analytics/trends");
    const response = await getTrends(request);
    const { status, data } = await parseResponse<{
      data: unknown[];
      currency: string;
    }>(response);

    expect(status).toBe(200);
    expect(data.data).toHaveLength(0);
    expect(data.currency).toBe("USD");
  });

  it("aggregates income and expenses by month", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([
      {
        type: "income",
        amount: 3000,
        currency: "USD",
        date: new Date("2026-01-15"),
      },
      {
        type: "expense",
        amount: 500,
        currency: "USD",
        date: new Date("2026-01-20"),
      },
      {
        type: "expense",
        amount: 200,
        currency: "USD",
        date: new Date("2026-01-25"),
      },
      {
        type: "income",
        amount: 3000,
        currency: "USD",
        date: new Date("2026-02-15"),
      },
      {
        type: "expense",
        amount: 800,
        currency: "USD",
        date: new Date("2026-02-20"),
      },
    ]);

    const request = createRequest("/api/analytics/trends");
    const response = await getTrends(request);
    const { status, data } = await parseResponse<{
      data: Array<{
        month: string;
        income: number;
        expense: number;
        net: number;
      }>;
    }>(response);

    expect(status).toBe(200);
    expect(data.data).toHaveLength(2);

    // January
    expect(data.data[0].month).toBe("2026-01");
    expect(data.data[0].income).toBe(3000);
    expect(data.data[0].expense).toBe(700);
    expect(data.data[0].net).toBe(2300);

    // February
    expect(data.data[1].month).toBe("2026-02");
    expect(data.data[1].income).toBe(3000);
    expect(data.data[1].expense).toBe(800);
    expect(data.data[1].net).toBe(2200);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireApiUser).mockResolvedValueOnce({
      user: null as never,
      error: true,
    });

    const request = createRequest("/api/analytics/trends");
    const response = await getTrends(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns empty data when space has no accounts", async () => {
    vi.mocked(getSpaceContext).mockResolvedValueOnce({
      spaceId: "space-1",
      spaceName: "Family",
      role: "owner",
    });
    vi.mocked(getSpaceAccountIds).mockResolvedValueOnce([]);

    const request = createRequest("/api/analytics/trends");
    const response = await getTrends(request);
    const { data } = await parseResponse<{
      data: unknown[];
      currency: string;
    }>(response);

    expect(data.data).toHaveLength(0);
    expect(data.currency).toBe("USD");
  });

  it("filters transactions by user ID when not in a space", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([]);

    const request = createRequest("/api/analytics/trends");
    await getTrends(request);

    expect(mockTransactionModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
        }),
      })
    );
  });

  it("sorts months chronologically", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([
      {
        type: "expense",
        amount: 100,
        currency: "USD",
        date: new Date("2026-03-01"),
      },
      {
        type: "expense",
        amount: 200,
        currency: "USD",
        date: new Date("2026-01-01"),
      },
    ]);

    const request = createRequest("/api/analytics/trends");
    const response = await getTrends(request);
    const { data } = await parseResponse<{
      data: Array<{ month: string }>;
    }>(response);

    expect(data.data[0].month).toBe("2026-01");
    expect(data.data[1].month).toBe("2026-03");
  });

  it("rounds amounts to 2 decimal places", async () => {
    mockTransactionModel.findMany.mockResolvedValueOnce([
      {
        type: "income",
        amount: 10.333,
        currency: "USD",
        date: new Date("2026-01-01"),
      },
      {
        type: "expense",
        amount: 5.777,
        currency: "USD",
        date: new Date("2026-01-01"),
      },
    ]);

    const request = createRequest("/api/analytics/trends");
    const response = await getTrends(request);
    const { data } = await parseResponse<{
      data: Array<{ income: number; expense: number; net: number }>;
    }>(response);

    expect(data.data[0].income).toBe(10.33);
    expect(data.data[0].expense).toBe(5.78);
    expect(data.data[0].net).toBe(4.56);
  });
});
