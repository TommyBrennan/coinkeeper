/**
 * Test helpers for API route integration tests.
 * Provides mock factories for auth, db, and request objects.
 */
import { vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mock user factory ──────────────────────────────────────────────────────

export interface MockUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: "user-1",
    username: "testuser",
    displayName: "Test User",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// ── Mock account factory ───────────────────────────────────────────────────

export interface MockAccount {
  id: string;
  userId: string;
  spaceId: string | null;
  name: string;
  type: string;
  currency: string;
  balance: number;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  lowBalanceThreshold: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createMockAccount(
  overrides: Partial<MockAccount> = {}
): MockAccount {
  return {
    id: "acc-1",
    userId: "user-1",
    spaceId: null,
    name: "Test Account",
    type: "bank",
    currency: "USD",
    balance: 1000,
    icon: null,
    color: null,
    isArchived: false,
    lowBalanceThreshold: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// ── Mock transaction factory ───────────────────────────────────────────────

export function createMockTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: "txn-1",
    userId: "user-1",
    type: "expense",
    amount: 25.5,
    currency: "USD",
    description: "Test expense",
    source: null,
    date: new Date("2026-03-01"),
    categoryId: null,
    category: null,
    fromAccountId: "acc-1",
    fromAccount: { id: "acc-1", name: "Test Account", currency: "USD" },
    toAccountId: null,
    toAccount: null,
    exchangeRate: null,
    toAmount: null,
    receiptId: null,
    isRecurring: false,
    recurringId: null,
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
    ...overrides,
  };
}

// ── Request builders ───────────────────────────────────────────────────────

export function createRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = "GET", body, headers = {} } = options;

  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

// ── Response helpers ───────────────────────────────────────────────────────

export async function parseResponse<T = unknown>(
  response: Response
): Promise<{ status: number; data: T }> {
  const status = response.status;

  if (status === 204) {
    return { status, data: null as T };
  }

  const data = (await response.json()) as T;
  return { status, data };
}

// ── Mock setup helpers ─────────────────────────────────────────────────────

/**
 * Create a mock Prisma model with common CRUD methods.
 */
export function createMockPrismaModel() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(null),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
  };
}
