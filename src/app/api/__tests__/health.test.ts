/**
 * Integration tests for /api/health route.
 * Tests health check endpoint for database connectivity and migration status.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    user: {
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

// ── Import handler after mocking ─────────────────────────────────────────

import { GET } from "../health/route";

// ── Tests ────────────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockResolvedValue([{ 1: 1 }]);
    mockDb.user.count.mockResolvedValue(0);
  });

  it("returns ok status when all checks pass", async () => {
    const response = await GET();
    const { status, data } = await parseResponse<{
      status: string;
      timestamp: string;
      version: string;
      checks: {
        database: { status: string; latencyMs: number };
        migrations: { status: string };
      };
    }>(response);

    expect(status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBeDefined();
    expect(data.checks.database.status).toBe("ok");
    expect(data.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(data.checks.migrations.status).toBe("ok");
  });

  it("returns error status when database is down", async () => {
    mockDb.$queryRaw.mockRejectedValueOnce(new Error("Connection refused"));

    const response = await GET();
    const { status, data } = await parseResponse<{
      status: string;
      checks: {
        database: { status: string; error: string };
      };
    }>(response);

    expect(status).toBe(503);
    expect(data.status).toBe("error");
    expect(data.checks.database.status).toBe("error");
    expect(data.checks.database.error).toBe("Connection refused");
  });

  it("returns error status when migrations are missing", async () => {
    mockDb.user.count.mockRejectedValueOnce(new Error("Table not found"));

    const response = await GET();
    const { status, data } = await parseResponse<{
      status: string;
      checks: {
        migrations: { status: string; error: string };
      };
    }>(response);

    expect(status).toBe(503);
    expect(data.status).toBe("error");
    expect(data.checks.migrations.status).toBe("error");
    expect(data.checks.migrations.error).toContain("migrations");
  });

  it("includes latency in database check", async () => {
    const response = await GET();
    const { data } = await parseResponse<{
      checks: { database: { latencyMs: number } };
    }>(response);

    expect(typeof data.checks.database.latencyMs).toBe("number");
    expect(data.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns version info", async () => {
    const response = await GET();
    const { data } = await parseResponse<{ version: string }>(response);

    expect(data.version).toBeTruthy();
  });

  it("returns ISO timestamp", async () => {
    const response = await GET();
    const { data } = await parseResponse<{ timestamp: string }>(response);

    // Verify it's a valid ISO date string
    const parsed = new Date(data.timestamp);
    expect(parsed.toISOString()).toBe(data.timestamp);
  });
});
