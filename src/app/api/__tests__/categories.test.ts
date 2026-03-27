/**
 * Integration tests for /api/categories routes.
 * Tests GET (list with auto-seeding), PATCH (rename), DELETE, and POST merge.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────

const { mockUser, mockCategoryModel, mockTransactionModel } = vi.hoisted(
  () => {
    const createModel = () => ({
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(null),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
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
      mockCategoryModel: createModel(),
      mockTransactionModel: createModel(),
    };
  }
);

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn().mockResolvedValue(mockUser),
}));

vi.mock("@/lib/category-normalize", () => ({
  normalizeName: vi.fn((name: string) => name.trim()),
}));

vi.mock("@/lib/db", () => ({
  db: {
    category: mockCategoryModel,
    transaction: mockTransactionModel,
  },
}));

// ── Import handlers after mocking ─────────────────────────────────────

import { GET } from "../categories/route";
import { PATCH, DELETE } from "../categories/[id]/route";
import { POST as MERGE } from "../categories/merge/route";

// ── Helpers ───────────────────────────────────────────────────────────

function createMockCategory(
  overrides: Record<string, unknown> = {}
) {
  return {
    id: "cat-1",
    userId: "user-1",
    name: "Food & Dining",
    icon: "utensils",
    color: "#ef4444",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("GET /api/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing categories sorted by name", async () => {
    const categories = [
      createMockCategory({ id: "cat-1", name: "Bills & Utilities" }),
      createMockCategory({ id: "cat-2", name: "Food & Dining" }),
    ];
    mockCategoryModel.findMany.mockResolvedValueOnce(categories);

    const response = await GET();
    const { status, data } = await parseResponse<unknown[]>(response);

    expect(status).toBe(200);
    expect(data).toHaveLength(2);
    expect(mockCategoryModel.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { name: "asc" },
    });
  });

  it("seeds default categories when user has none", async () => {
    // First call returns empty (no categories), second call returns seeded categories
    const seeded = [
      createMockCategory({ id: "cat-1", name: "Bills & Utilities" }),
      createMockCategory({ id: "cat-2", name: "Food & Dining" }),
    ];
    mockCategoryModel.findMany
      .mockResolvedValueOnce([]) // first call — empty
      .mockResolvedValueOnce(seeded); // second call — after seeding

    const response = await GET();
    const { status, data } = await parseResponse<unknown[]>(response);

    expect(status).toBe(200);
    expect(data).toHaveLength(2);
    expect(mockCategoryModel.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userId: "user-1", name: "Food & Dining" }),
        expect.objectContaining({ userId: "user-1", name: "Transport" }),
      ]),
    });
  });

  it("does not seed if categories already exist", async () => {
    const categories = [createMockCategory()];
    mockCategoryModel.findMany.mockResolvedValueOnce(categories);

    await GET();

    expect(mockCategoryModel.createMany).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/categories/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renames a category with valid name", async () => {
    const existing = createMockCategory({ id: "cat-1", name: "Food" });
    const updated = { ...existing, name: "Food & Drinks" };
    mockCategoryModel.findFirst
      .mockResolvedValueOnce(existing) // ownership check
      .mockResolvedValueOnce(null); // duplicate check
    mockCategoryModel.update.mockResolvedValueOnce(updated);

    const request = createRequest("/api/categories/cat-1", {
      method: "PATCH",
      body: { name: "Food & Drinks" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "cat-1" }),
    });
    const { status, data } = await parseResponse<{ name: string }>(response);

    expect(status).toBe(200);
    expect(data.name).toBe("Food & Drinks");
  });

  it("returns 400 if name is missing", async () => {
    const request = createRequest("/api/categories/cat-1", {
      method: "PATCH",
      body: {},
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "cat-1" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 if name is empty string", async () => {
    const request = createRequest("/api/categories/cat-1", {
      method: "PATCH",
      body: { name: "   " },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "cat-1" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 404 if category not found", async () => {
    mockCategoryModel.findFirst.mockResolvedValueOnce(null);

    const request = createRequest("/api/categories/nonexistent", {
      method: "PATCH",
      body: { name: "New Name" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });

  it("returns 409 if duplicate name exists", async () => {
    const existing = createMockCategory({ id: "cat-1", name: "Food" });
    const duplicate = createMockCategory({ id: "cat-2", name: "Transport" });
    mockCategoryModel.findFirst
      .mockResolvedValueOnce(existing) // ownership check
      .mockResolvedValueOnce(duplicate); // duplicate check — found one
    const request = createRequest("/api/categories/cat-1", {
      method: "PATCH",
      body: { name: "Transport" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "cat-1" }),
    });
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(409);
    expect(data.error).toContain("already exists");
  });
});

describe("DELETE /api/categories/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes category and unsets transactions", async () => {
    const existing = createMockCategory({ id: "cat-1" });
    mockCategoryModel.findFirst.mockResolvedValueOnce(existing);
    mockTransactionModel.updateMany.mockResolvedValueOnce({ count: 3 });
    mockCategoryModel.delete.mockResolvedValueOnce(existing);

    const request = createRequest("/api/categories/cat-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "cat-1" }),
    });
    const { status, data } = await parseResponse<{ deleted: boolean }>(
      response
    );

    expect(status).toBe(200);
    expect(data.deleted).toBe(true);
    // Should unset categoryId on related transactions
    expect(mockTransactionModel.updateMany).toHaveBeenCalledWith({
      where: { categoryId: "cat-1" },
      data: { categoryId: null },
    });
    expect(mockCategoryModel.delete).toHaveBeenCalledWith({
      where: { id: "cat-1" },
    });
  });

  it("returns 404 if category not found", async () => {
    mockCategoryModel.findFirst.mockResolvedValueOnce(null);

    const request = createRequest("/api/categories/nonexistent", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const { status } = await parseResponse(response);

    expect(status).toBe(404);
  });
});

describe("POST /api/categories/merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges source category into target", async () => {
    const source = createMockCategory({ id: "cat-1", name: "Groceries" });
    const target = createMockCategory({ id: "cat-2", name: "Food & Dining" });
    mockCategoryModel.findFirst
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(target);
    mockTransactionModel.updateMany.mockResolvedValueOnce({ count: 5 });
    mockCategoryModel.delete.mockResolvedValueOnce(source);

    const request = createRequest("/api/categories/merge", {
      method: "POST",
      body: { sourceId: "cat-1", targetId: "cat-2" },
    });
    const response = await MERGE(request);
    const { status, data } = await parseResponse<{
      merged: boolean;
      transactionsMoved: number;
    }>(response);

    expect(status).toBe(200);
    expect(data.merged).toBe(true);
    expect(data.transactionsMoved).toBe(5);
    expect(mockTransactionModel.updateMany).toHaveBeenCalledWith({
      where: { categoryId: "cat-1" },
      data: { categoryId: "cat-2" },
    });
    expect(mockCategoryModel.delete).toHaveBeenCalledWith({
      where: { id: "cat-1" },
    });
  });

  it("returns 400 if sourceId or targetId is missing", async () => {
    const request = createRequest("/api/categories/merge", {
      method: "POST",
      body: { sourceId: "cat-1" },
    });
    const response = await MERGE(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 400 if sourceId equals targetId", async () => {
    const request = createRequest("/api/categories/merge", {
      method: "POST",
      body: { sourceId: "cat-1", targetId: "cat-1" },
    });
    const response = await MERGE(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(400);
    expect(data.error).toContain("itself");
  });

  it("returns 404 if source category not found", async () => {
    mockCategoryModel.findFirst.mockResolvedValueOnce(null); // source not found

    const request = createRequest("/api/categories/merge", {
      method: "POST",
      body: { sourceId: "nonexistent", targetId: "cat-2" },
    });
    const response = await MERGE(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(404);
    expect(data.error).toContain("Source");
  });

  it("returns 404 if target category not found", async () => {
    const source = createMockCategory({ id: "cat-1" });
    mockCategoryModel.findFirst
      .mockResolvedValueOnce(source) // source found
      .mockResolvedValueOnce(null); // target not found

    const request = createRequest("/api/categories/merge", {
      method: "POST",
      body: { sourceId: "cat-1", targetId: "nonexistent" },
    });
    const response = await MERGE(request);
    const { status, data } = await parseResponse<{ error: string }>(response);

    expect(status).toBe(404);
    expect(data.error).toContain("Target");
  });
});
