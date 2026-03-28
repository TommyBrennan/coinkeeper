/**
 * Integration tests for /api/settings routes.
 * Tests GET (read settings) and PATCH (update settings) endpoints.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockUser, mockUserModel } = vi.hoisted(() => {
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
    mockUserModel: createModel(),
  };
});

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: mockUserModel,
  },
}));

// ── Import handlers after mocking ────────────────────────────────────────────

import { GET, PATCH } from "../settings/route";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("/api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/settings", () => {
    it("returns user settings", async () => {
      mockUserModel.findUnique.mockResolvedValue({
        reminderDays: 3,
        baseCurrency: "EUR",
      });

      createRequest("http://localhost:3000/api/settings");
      const res = await GET();
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data).toEqual({
        reminderDays: 3,
        baseCurrency: "EUR",
      });
      expect(mockUserModel.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { reminderDays: true, baseCurrency: true },
      });
    });

    it("returns defaults when user has no settings", async () => {
      mockUserModel.findUnique.mockResolvedValue(null);

      const res = await GET();
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data).toEqual({
        reminderDays: null,
        baseCurrency: "USD",
      });
    });

    it("returns 401 when unauthenticated", async () => {
      const { requireApiUser } = await import("@/lib/auth");
      vi.mocked(requireApiUser).mockResolvedValueOnce({
        user: null as never,
        error: true as never,
      });

      const res = await GET();
      const { status, data } = await parseResponse<{ error: string }>(res);

      expect(status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("PATCH /api/settings", () => {
    it("updates reminderDays", async () => {
      mockUserModel.update.mockResolvedValue({ id: "user-1" });

      const req = createRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: { reminderDays: 5 },
      });
      const res = await PATCH(req);
      const { status, data } = await parseResponse<{ success: boolean }>(res);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUserModel.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { reminderDays: 5 },
      });
    });

    it("clears reminderDays when set to null", async () => {
      mockUserModel.update.mockResolvedValue({ id: "user-1" });

      const req = createRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: { reminderDays: null },
      });
      const res = await PATCH(req);
      const { status } = await parseResponse(res);

      expect(status).toBe(200);
      expect(mockUserModel.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { reminderDays: null },
      });
    });

    it("rejects invalid reminderDays (zero)", async () => {
      const req = createRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: { reminderDays: 0 },
      });
      const res = await PATCH(req);
      const { status, data } = await parseResponse<{ error: string }>(res);

      expect(status).toBe(400);
      expect(data.error).toContain("positive integer");
    });

    it("rejects invalid reminderDays (negative)", async () => {
      const req = createRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: { reminderDays: -3 },
      });
      const res = await PATCH(req);
      const { status, data } = await parseResponse<{ error: string }>(res);

      expect(status).toBe(400);
      expect(data.error).toContain("positive integer");
    });

    it("updates baseCurrency", async () => {
      mockUserModel.update.mockResolvedValue({ id: "user-1" });

      const req = createRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: { baseCurrency: "eur" },
      });
      const res = await PATCH(req);
      const { status } = await parseResponse(res);

      expect(status).toBe(200);
      expect(mockUserModel.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { baseCurrency: "EUR" },
      });
    });

    it("rejects invalid baseCurrency (too long)", async () => {
      const req = createRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: { baseCurrency: "ABCD" },
      });
      const res = await PATCH(req);
      const { status, data } = await parseResponse<{ error: string }>(res);

      expect(status).toBe(400);
      expect(data.error).toContain("3-letter");
    });

    it("rejects invalid baseCurrency (too short)", async () => {
      const req = createRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: { baseCurrency: "AB" },
      });
      const res = await PATCH(req);
      const { status, data } = await parseResponse<{ error: string }>(res);

      expect(status).toBe(400);
      expect(data.error).toContain("3-letter");
    });

    it("updates both fields at once", async () => {
      mockUserModel.update.mockResolvedValue({ id: "user-1" });

      const req = createRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: { reminderDays: 7, baseCurrency: "GBP" },
      });
      const res = await PATCH(req);
      const { status } = await parseResponse(res);

      expect(status).toBe(200);
      expect(mockUserModel.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { reminderDays: 7, baseCurrency: "GBP" },
      });
    });

    it("does not call update when no fields provided", async () => {
      const req = createRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: {},
      });
      const res = await PATCH(req);
      const { status } = await parseResponse(res);

      expect(status).toBe(200);
      expect(mockUserModel.update).not.toHaveBeenCalled();
    });

    it("returns 401 when unauthenticated", async () => {
      const { requireApiUser } = await import("@/lib/auth");
      vi.mocked(requireApiUser).mockResolvedValueOnce({
        user: null as never,
        error: true as never,
      });

      const req = createRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: { reminderDays: 5 },
      });
      const res = await PATCH(req);
      const { status } = await parseResponse(res);

      expect(status).toBe(401);
    });
  });
});
