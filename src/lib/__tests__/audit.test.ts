/**
 * Unit tests for audit log helper.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db", () => ({
  db: {
    auditLog: {
      create: mockCreate,
    },
  },
}));

import { logAuditEvent } from "../audit";

describe("logAuditEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an audit log entry with basic fields", async () => {
    await logAuditEvent("login", "user-1");

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        action: "login",
        metadata: null,
        ipAddress: null,
        userAgent: null,
      },
    });
  });

  it("serializes metadata as JSON", async () => {
    await logAuditEvent("register", "user-1", { email: "test@test.com" });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: JSON.stringify({ email: "test@test.com" }),
      }),
    });
  });

  it("extracts IP from x-forwarded-for header", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
        "user-agent": "TestAgent/1.0",
      },
    });

    await logAuditEvent("login", "user-1", null, request);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: "1.2.3.4",
        userAgent: "TestAgent/1.0",
      }),
    });
  });

  it("falls back to x-real-ip header", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-real-ip": "10.0.0.1",
      },
    });

    await logAuditEvent("logout", "user-1", null, request);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: "10.0.0.1",
      }),
    });
  });

  it("allows null userId for failed login", async () => {
    await logAuditEvent("login_failed", null, { email: "bad@test.com" });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        action: "login_failed",
      }),
    });
  });

  it("does not throw if db.create fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("DB error"));

    // Should not throw
    await expect(
      logAuditEvent("login", "user-1")
    ).resolves.toBeUndefined();
  });
});
