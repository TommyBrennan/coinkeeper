/**
 * Integration tests for recurring income execution.
 * Tests execute-recurring-income lib + API routes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseResponse } from "./helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────

const {
  mockUser,
  mockRecurringRuleModel,
  mockTransactionModel,
  mockAccountModel,
  mockNotificationModel,
  mockTransaction,
} = vi.hoisted(() => {
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
    mockRecurringRuleModel: createModel(),
    mockTransactionModel: createModel(),
    mockAccountModel: createModel(),
    mockNotificationModel: createModel(),
    mockTransaction: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ user: mockUser, error: false }),
}));

vi.mock("@/lib/schedule", () => ({
  calculateNextExecution: vi
    .fn()
    .mockReturnValue(new Date("2026-05-01T00:00:00Z")),
}));

vi.mock("@/lib/push-notifications", () => ({
  sendPushForNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  db: {
    recurringRule: mockRecurringRuleModel,
    transaction: mockTransactionModel,
    account: mockAccountModel,
    notification: mockNotificationModel,
    $transaction: mockTransaction,
  },
}));

// ── Import after mocking ──────────────────────────────────────────────

import {
  executeRecurringIncome,
  executeDueRecurringIncome,
} from "@/lib/execute-recurring-income";
import { POST as BulkExecutePost } from "../recurring-income/execute/route";
import { POST as SingleExecutePost } from "../recurring-income/[id]/execute/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────

function createMockRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    frequency: "monthly",
    interval: 1,
    nextExecution: new Date("2026-03-01T00:00:00Z"),
    lastExecution: new Date("2026-02-01T00:00:00Z"),
    endDate: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    transactions: [
      {
        id: "txn-template",
        userId: "user-1",
        type: "income",
        amount: 5000,
        currency: "USD",
        description: "Monthly salary",
        source: "Employer Inc",
        date: new Date("2026-02-01"),
        categoryId: "cat-1",
        toAccountId: "acc-1",
        toAccount: {
          id: "acc-1",
          name: "Main Account",
          currency: "USD",
          spaceId: null,
        },
        isRecurring: true,
        recurringId: "rule-1",
      },
    ],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("execute-recurring-income", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: $transaction executes the callback with mock tx
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const mockTx = {
        transaction: {
          create: vi.fn().mockResolvedValue({ id: "txn-new" }),
        },
        account: {
          update: vi.fn().mockResolvedValue({}),
        },
        recurringRule: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(mockTx);
    });
    mockNotificationModel.create.mockResolvedValue({});
  });

  describe("executeRecurringIncome", () => {
    it("should execute a due recurring income rule", async () => {
      const rule = createMockRule();
      mockRecurringRuleModel.findUnique.mockResolvedValue(rule);

      const result = await executeRecurringIncome("rule-1", "user-1");

      expect(result.ruleId).toBe("rule-1");
      expect(result.transactionId).toBe("txn-new");
      expect(result.amount).toBe(5000);
      expect(result.currency).toBe("USD");
      expect(result.accountId).toBe("acc-1");
      expect(result.deactivated).toBe(false);
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it("should throw if rule not found", async () => {
      mockRecurringRuleModel.findUnique.mockResolvedValue(null);

      await expect(
        executeRecurringIncome("rule-missing", "user-1")
      ).rejects.toThrow("Recurring rule not found");
    });

    it("should throw if rule is not active", async () => {
      const rule = createMockRule({ isActive: false });
      mockRecurringRuleModel.findUnique.mockResolvedValue(rule);

      await expect(
        executeRecurringIncome("rule-1", "user-1")
      ).rejects.toThrow("Recurring rule is not active");
    });

    it("should throw if no income transaction found", async () => {
      const rule = createMockRule({ transactions: [] });
      mockRecurringRuleModel.findUnique.mockResolvedValue(rule);

      await expect(
        executeRecurringIncome("rule-1", "user-1")
      ).rejects.toThrow("No income transaction found for this recurring rule");
    });

    it("should deactivate rule when endDate is passed", async () => {
      const rule = createMockRule({
        endDate: new Date("2026-04-15T00:00:00Z"),
      });
      mockRecurringRuleModel.findUnique.mockResolvedValue(rule);

      // calculateNextExecution returns 2026-05-01 which is > endDate 2026-04-15
      const result = await executeRecurringIncome("rule-1", "user-1");

      expect(result.deactivated).toBe(true);
    });

    it("should not deactivate rule when endDate is in the future", async () => {
      const rule = createMockRule({
        endDate: new Date("2026-12-31T00:00:00Z"),
      });
      mockRecurringRuleModel.findUnique.mockResolvedValue(rule);

      // calculateNextExecution returns 2026-05-01 which is < endDate 2026-12-31
      const result = await executeRecurringIncome("rule-1", "user-1");

      expect(result.deactivated).toBe(false);
    });
  });

  describe("executeDueRecurringIncome", () => {
    it("should execute all due recurring rules", async () => {
      const rules = [
        createMockRule({ id: "rule-1" }),
        createMockRule({ id: "rule-2" }),
      ];
      mockRecurringRuleModel.findMany.mockResolvedValue(rules);
      mockRecurringRuleModel.findUnique
        .mockResolvedValueOnce(rules[0])
        .mockResolvedValueOnce(rules[1]);

      const result = await executeDueRecurringIncome("user-1");

      expect(result.executed).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("should return empty arrays when no rules are due", async () => {
      mockRecurringRuleModel.findMany.mockResolvedValue([]);

      const result = await executeDueRecurringIncome("user-1");

      expect(result.executed).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should collect errors without stopping execution", async () => {
      const rules = [
        createMockRule({ id: "rule-1", isActive: false }),
        createMockRule({ id: "rule-2" }),
      ];
      mockRecurringRuleModel.findMany.mockResolvedValue(rules);
      // First rule will fail (inactive when re-fetched)
      mockRecurringRuleModel.findUnique
        .mockResolvedValueOnce({ ...rules[0], isActive: false })
        .mockResolvedValueOnce(rules[1]);

      const result = await executeDueRecurringIncome("user-1");

      expect(result.executed).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].ruleId).toBe("rule-1");
    });
  });
});

describe("API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const mockTx = {
        transaction: {
          create: vi.fn().mockResolvedValue({ id: "txn-new" }),
        },
        account: {
          update: vi.fn().mockResolvedValue({}),
        },
        recurringRule: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(mockTx);
    });
    mockNotificationModel.create.mockResolvedValue({});
  });

  describe("POST /api/recurring-income/execute", () => {
    it("should execute all due recurring income and return summary", async () => {
      mockRecurringRuleModel.findMany.mockResolvedValue([
        createMockRule({ id: "rule-1" }),
      ]);
      mockRecurringRuleModel.findUnique.mockResolvedValue(
        createMockRule({ id: "rule-1" })
      );

      const response = await BulkExecutePost();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toHaveProperty("executed", 1);
      expect(data).toHaveProperty("errors", 0);
    });

    it("should return 401 when not authenticated", async () => {
      const { requireApiUser } = await import("@/lib/auth");
      (requireApiUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: null,
        error: true,
      });

      const response = await BulkExecutePost();
      const { status } = await parseResponse(response);

      expect(status).toBe(401);
    });
  });

  describe("POST /api/recurring-income/[id]/execute", () => {
    it("should execute a single recurring income rule", async () => {
      mockRecurringRuleModel.findUnique.mockResolvedValue(
        createMockRule({ id: "rule-1" })
      );

      const request = new NextRequest(
        new URL("http://localhost:3000/api/recurring-income/rule-1/execute"),
        { method: "POST" }
      );
      const response = await SingleExecutePost(request, {
        params: Promise.resolve({ id: "rule-1" }),
      });
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toHaveProperty("ruleId", "rule-1");
      expect(data).toHaveProperty("transactionId", "txn-new");
    });

    it("should return 404 for unknown rule", async () => {
      mockRecurringRuleModel.findUnique.mockResolvedValue(null);

      const request = new NextRequest(
        new URL("http://localhost:3000/api/recurring-income/unknown/execute"),
        { method: "POST" }
      );
      const response = await SingleExecutePost(request, {
        params: Promise.resolve({ id: "unknown" }),
      });
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data).toHaveProperty("error", "Recurring rule not found");
    });

    it("should return 400 for inactive rule", async () => {
      mockRecurringRuleModel.findUnique.mockResolvedValue(
        createMockRule({ isActive: false })
      );

      const request = new NextRequest(
        new URL("http://localhost:3000/api/recurring-income/rule-1/execute"),
        { method: "POST" }
      );
      const response = await SingleExecutePost(request, {
        params: Promise.resolve({ id: "rule-1" }),
      });
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data).toHaveProperty("error", "Recurring rule is not active");
    });
  });
});
