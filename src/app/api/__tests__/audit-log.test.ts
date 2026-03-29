/**
 * Integration tests for /api/audit-log GET endpoint.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────

const { mockAuditLogModel, mockRequireApiUser } = vi.hoisted(() => {
  return {
    mockAuditLogModel: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(null),
    },
    mockRequireApiUser: vi
      .fn()
      .mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@example.com" },
        error: false,
      }),
  };
});

vi.mock("@/lib/auth", () => ({
  requireApiUser: mockRequireApiUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    auditLog: mockAuditLogModel,
  },
}));

import { GET } from "../audit-log/route";

// ── Tests ────────────────────────────────────────────────────────────────

describe("GET /api/audit-log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireApiUser.mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@example.com" },
      error: false,
    });
  });

  it("returns 401 if not authenticated", async () => {
    mockRequireApiUser.mockResolvedValueOnce({ user: null, error: true });

    const req = createRequest("http://localhost:3000/api/audit-log");
    const res = await GET(req);
    const { status, data } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns empty entries when no audit logs exist", async () => {
    mockAuditLogModel.findMany.mockResolvedValueOnce([]);

    const req = createRequest("http://localhost:3000/api/audit-log");
    const res = await GET(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.entries).toEqual([]);
    expect(data.nextCursor).toBeUndefined();
  });

  it("returns audit log entries with parsed metadata", async () => {
    const now = new Date();
    mockAuditLogModel.findMany.mockResolvedValueOnce([
      {
        id: "log-1",
        userId: "user-1",
        action: "login",
        metadata: JSON.stringify({ method: "totp" }),
        ipAddress: "192.168.1.1",
        userAgent: "TestBrowser/1.0",
        createdAt: now,
      },
      {
        id: "log-2",
        userId: "user-1",
        action: "logout",
        metadata: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(now.getTime() - 1000),
      },
    ]);

    const req = createRequest("http://localhost:3000/api/audit-log?limit=20");
    const res = await GET(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0].action).toBe("login");
    expect(data.entries[0].metadata).toEqual({ method: "totp" });
    expect(data.entries[0].ipAddress).toBe("192.168.1.1");
    expect(data.entries[1].action).toBe("logout");
    expect(data.entries[1].metadata).toBeNull();
    expect(data.nextCursor).toBeUndefined();
  });

  it("returns nextCursor when more entries exist", async () => {
    const entries = Array.from({ length: 21 }, (_, i) => ({
      id: `log-${i}`,
      userId: "user-1",
      action: "login",
      metadata: null,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(Date.now() - i * 1000),
    }));

    mockAuditLogModel.findMany.mockResolvedValueOnce(entries);

    const req = createRequest("http://localhost:3000/api/audit-log?limit=20");
    const res = await GET(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.entries).toHaveLength(20);
    expect(data.nextCursor).toBeDefined();
  });

  it("uses cursor for pagination", async () => {
    mockAuditLogModel.findMany.mockResolvedValueOnce([]);

    const cursor = "2026-03-29T00:00:00.000Z";
    const req = createRequest(`http://localhost:3000/api/audit-log?cursor=${cursor}&limit=10`);
    const res = await GET(req);

    expect(mockAuditLogModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          createdAt: { lt: new Date(cursor) },
        }),
        take: 11, // limit + 1
      })
    );

    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("clamps limit to max 100", async () => {
    mockAuditLogModel.findMany.mockResolvedValueOnce([]);

    const req = createRequest("http://localhost:3000/api/audit-log?limit=500");
    await GET(req);

    expect(mockAuditLogModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 101, // 100 + 1
      })
    );
  });
});
