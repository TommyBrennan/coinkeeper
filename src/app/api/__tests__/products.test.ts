/**
 * Integration tests for /api/products routes.
 * Tests GET (list/search) and GET /api/products/[id]/prices (price history).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockUser, mockProductModel, mockProductPriceModel } = vi.hoisted(() => {
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
    mockProductModel: createModel(),
    mockProductPriceModel: createModel(),
  };
});

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    product: mockProductModel,
    productPrice: mockProductPriceModel,
  },
}));

// ── Import handlers after mocking ────────────────────────────────────────────

import { GET as listProducts } from "../products/route";
import { GET as getProductPrices } from "../products/[id]/prices/route";

// ── Test data factories ──────────────────────────────────────────────────────

function createMockProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "prod-1",
    userId: "user-1",
    name: "Whole Milk 1L",
    normalizedName: "whole milk 1l",
    prices: [
      {
        unitPrice: 3.49,
        currency: "USD",
        merchant: "Whole Foods",
        date: new Date("2026-03-01"),
      },
    ],
    _count: { prices: 5 },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-03-01"),
    ...overrides,
  };
}

function createMockPrice(overrides: Record<string, unknown> = {}) {
  return {
    id: "price-1",
    unitPrice: 3.49,
    currency: "USD",
    merchant: "Whole Foods",
    date: new Date("2026-03-01"),
    receiptId: null,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("/api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/products", () => {
    it("returns empty list when no products", async () => {
      mockProductModel.findMany.mockResolvedValue([]);
      mockProductModel.count.mockResolvedValue(0);

      const req = createRequest("http://localhost:3000/api/products");
      const res = await listProducts(req);
      const { status, data } = await parseResponse<{
        data: unknown[];
        total: number;
        limit: number;
        offset: number;
      }>(res);

      expect(status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
    });

    it("returns products with latest price", async () => {
      const product = createMockProduct();
      mockProductModel.findMany.mockResolvedValue([product]);
      mockProductModel.count.mockResolvedValue(1);

      const req = createRequest("http://localhost:3000/api/products");
      const res = await listProducts(req);
      const { status, data } = await parseResponse<{
        data: Array<{
          id: string;
          name: string;
          normalizedName: string;
          latestPrice: { unitPrice: number } | null;
          observationCount: number;
        }>;
        total: number;
      }>(res);

      expect(status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe("prod-1");
      expect(data.data[0].name).toBe("Whole Milk 1L");
      expect(data.data[0].latestPrice?.unitPrice).toBe(3.49);
      expect(data.data[0].observationCount).toBe(5);
      expect(data.total).toBe(1);
    });

    it("filters by search query", async () => {
      mockProductModel.findMany.mockResolvedValue([]);
      mockProductModel.count.mockResolvedValue(0);

      const req = createRequest("http://localhost:3000/api/products?q=milk");
      const res = await listProducts(req);

      expect(mockProductModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-1",
            normalizedName: { contains: "milk" },
          },
        })
      );
    });

    it("applies pagination params", async () => {
      mockProductModel.findMany.mockResolvedValue([]);
      mockProductModel.count.mockResolvedValue(0);

      const req = createRequest(
        "http://localhost:3000/api/products?limit=10&offset=20"
      );
      const res = await listProducts(req);
      const { data } = await parseResponse<{
        limit: number;
        offset: number;
      }>(res);

      expect(data.limit).toBe(10);
      expect(data.offset).toBe(20);
      expect(mockProductModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it("clamps limit to valid range", async () => {
      mockProductModel.findMany.mockResolvedValue([]);
      mockProductModel.count.mockResolvedValue(0);

      const req = createRequest(
        "http://localhost:3000/api/products?limit=500"
      );
      const res = await listProducts(req);
      const { data } = await parseResponse<{ limit: number }>(res);

      expect(data.limit).toBe(200);
    });

    it("returns 401 when unauthenticated", async () => {
      const { requireApiUser } = await import("@/lib/auth");
      vi.mocked(requireApiUser).mockResolvedValueOnce({
        user: null as never,
        error: true as never,
      });

      const req = createRequest("http://localhost:3000/api/products");
      const res = await listProducts(req);
      const { status } = await parseResponse(res);

      expect(status).toBe(401);
    });
  });

  describe("GET /api/products/[id]/prices", () => {
    it("returns price history with stats", async () => {
      const product = {
        id: "prod-1",
        userId: "user-1",
        name: "Whole Milk 1L",
        normalizedName: "whole milk 1l",
      };
      const prices = [
        createMockPrice({ id: "p1", unitPrice: 3.49, merchant: "Whole Foods" }),
        createMockPrice({ id: "p2", unitPrice: 2.99, merchant: "Trader Joes" }),
        createMockPrice({ id: "p3", unitPrice: 3.99, merchant: "Whole Foods" }),
      ];

      mockProductModel.findFirst.mockResolvedValue(product);
      mockProductPriceModel.findMany.mockResolvedValue(prices);

      const req = createRequest(
        "http://localhost:3000/api/products/prod-1/prices"
      );
      const res = await getProductPrices(req, {
        params: Promise.resolve({ id: "prod-1" }),
      });
      const { status, data } = await parseResponse<{
        product: { id: string; name: string };
        prices: unknown[];
        stats: {
          count: number;
          avgPrice: number;
          minPrice: number;
          maxPrice: number;
          merchantCount: number;
          merchants: string[];
        };
      }>(res);

      expect(status).toBe(200);
      expect(data.product.id).toBe("prod-1");
      expect(data.product.name).toBe("Whole Milk 1L");
      expect(data.prices).toHaveLength(3);
      expect(data.stats.count).toBe(3);
      expect(data.stats.minPrice).toBe(2.99);
      expect(data.stats.maxPrice).toBe(3.99);
      expect(data.stats.merchantCount).toBe(2);
      expect(data.stats.merchants).toContain("Whole Foods");
      expect(data.stats.merchants).toContain("Trader Joes");
    });

    it("returns empty stats when no prices", async () => {
      const product = {
        id: "prod-1",
        userId: "user-1",
        name: "Whole Milk 1L",
        normalizedName: "whole milk 1l",
      };

      mockProductModel.findFirst.mockResolvedValue(product);
      mockProductPriceModel.findMany.mockResolvedValue([]);

      const req = createRequest(
        "http://localhost:3000/api/products/prod-1/prices"
      );
      const res = await getProductPrices(req, {
        params: Promise.resolve({ id: "prod-1" }),
      });
      const { status, data } = await parseResponse<{
        stats: { count: number; avgPrice: number };
      }>(res);

      expect(status).toBe(200);
      expect(data.stats.count).toBe(0);
      expect(data.stats.avgPrice).toBe(0);
    });

    it("filters by merchant query param", async () => {
      const product = {
        id: "prod-1",
        userId: "user-1",
        name: "Whole Milk 1L",
        normalizedName: "whole milk 1l",
      };

      mockProductModel.findFirst.mockResolvedValue(product);
      mockProductPriceModel.findMany.mockResolvedValue([]);

      const req = createRequest(
        "http://localhost:3000/api/products/prod-1/prices?merchant=Whole%20Foods"
      );
      const res = await getProductPrices(req, {
        params: Promise.resolve({ id: "prod-1" }),
      });

      expect(mockProductPriceModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            productId: "prod-1",
            merchant: "Whole Foods",
          },
        })
      );
    });

    it("returns 404 for non-existent product", async () => {
      mockProductModel.findFirst.mockResolvedValue(null);

      const req = createRequest(
        "http://localhost:3000/api/products/nonexistent/prices"
      );
      const res = await getProductPrices(req, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      const { status, data } = await parseResponse<{ error: string }>(res);

      expect(status).toBe(404);
      expect(data.error).toBe("Product not found");
    });

    it("returns 404 for product belonging to another user", async () => {
      // findFirst with userId filter returns null for other users' products
      mockProductModel.findFirst.mockResolvedValue(null);

      const req = createRequest(
        "http://localhost:3000/api/products/prod-other/prices"
      );
      const res = await getProductPrices(req, {
        params: Promise.resolve({ id: "prod-other" }),
      });
      const { status } = await parseResponse(res);

      expect(status).toBe(404);
      expect(mockProductModel.findFirst).toHaveBeenCalledWith({
        where: { id: "prod-other", userId: "user-1" },
      });
    });

    it("returns 401 when unauthenticated", async () => {
      const { requireApiUser } = await import("@/lib/auth");
      vi.mocked(requireApiUser).mockResolvedValueOnce({
        user: null as never,
        error: true as never,
      });

      const req = createRequest(
        "http://localhost:3000/api/products/prod-1/prices"
      );
      const res = await getProductPrices(req, {
        params: Promise.resolve({ id: "prod-1" }),
      });
      const { status } = await parseResponse(res);

      expect(status).toBe(401);
    });
  });
});
