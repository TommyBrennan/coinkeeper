import { describe, it, expect } from "vitest";
import {
  createAccountSchema,
  updateAccountSchema,
  createTransactionSchema,
  transactionQuerySchema,
  createScheduledTransferSchema,
  createReportSchema,
  updateReportSchema,
  createSpaceSchema,
  inviteMemberSchema,
  registerOptionsSchema,
  loginOptionsSchema,
} from "@/lib/validations";

// ─── Account schemas ────────────────────────────────────────────────

describe("createAccountSchema", () => {
  it("accepts valid account data", () => {
    const result = createAccountSchema.safeParse({
      name: "Checking",
      type: "bank",
      currency: "EUR",
      balance: 1000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Checking");
      expect(result.data.type).toBe("bank");
    }
  });

  it("provides defaults for optional fields", () => {
    const result = createAccountSchema.safeParse({
      name: "Cash",
      type: "cash",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance).toBe(0);
    }
  });

  it("rejects empty name", () => {
    const result = createAccountSchema.safeParse({
      name: "",
      type: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid account type", () => {
    const result = createAccountSchema.safeParse({
      name: "Test",
      type: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding max length", () => {
    const result = createAccountSchema.safeParse({
      name: "a".repeat(501),
      type: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from name", () => {
    const result = createAccountSchema.safeParse({
      name: "  My Account  ",
      type: "bank",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("My Account");
    }
  });

  it("accepts lowBalanceThreshold as number", () => {
    const result = createAccountSchema.safeParse({
      name: "Test",
      type: "bank",
      lowBalanceThreshold: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lowBalanceThreshold).toBe(100);
    }
  });

  it("transforms lowBalanceThreshold from string", () => {
    const result = createAccountSchema.safeParse({
      name: "Test",
      type: "bank",
      lowBalanceThreshold: "50.5",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lowBalanceThreshold).toBe(50.5);
    }
  });

  it("rejects negative lowBalanceThreshold", () => {
    const result = createAccountSchema.safeParse({
      name: "Test",
      type: "bank",
      lowBalanceThreshold: -10,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateAccountSchema", () => {
  it("accepts partial updates", () => {
    const result = updateAccountSchema.safeParse({ name: "Updated" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no updates)", () => {
    const result = updateAccountSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = updateAccountSchema.safeParse({ type: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts null lowBalanceThreshold (to clear it)", () => {
    const result = updateAccountSchema.safeParse({ lowBalanceThreshold: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lowBalanceThreshold).toBeNull();
    }
  });
});

// ─── Transaction schemas ────────────────────────────────────────────

describe("createTransactionSchema", () => {
  it("accepts valid expense", () => {
    const result = createTransactionSchema.safeParse({
      type: "expense",
      amount: 25.50,
      fromAccountId: "acc_123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = createTransactionSchema.safeParse({
      type: "expense",
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = createTransactionSchema.safeParse({
      type: "expense",
      amount: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid transaction type", () => {
    const result = createTransactionSchema.safeParse({
      type: "refund",
      amount: 10,
    });
    expect(result.success).toBe(false);
  });

  it("defaults isRecurring to false", () => {
    const result = createTransactionSchema.safeParse({
      type: "income",
      amount: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRecurring).toBe(false);
    }
  });
});

describe("transactionQuerySchema", () => {
  it("provides defaults for limit and offset", () => {
    const result = transactionQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
    }
  });

  it("coerces string numbers", () => {
    const result = transactionQuerySchema.safeParse({
      limit: "25",
      offset: "10",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
      expect(result.data.offset).toBe(10);
    }
  });

  it("caps limit at 200", () => {
    const result = transactionQuerySchema.safeParse({ limit: "500" });
    expect(result.success).toBe(false);
  });

  it("rejects negative offset", () => {
    const result = transactionQuerySchema.safeParse({ offset: "-1" });
    expect(result.success).toBe(false);
  });
});

// ─── Scheduled Transfer schemas ─────────────────────────────────────

describe("createScheduledTransferSchema", () => {
  const validData = {
    fromAccountId: "acc_1",
    toAccountId: "acc_2",
    amount: 100,
    frequency: "monthly" as const,
  };

  it("accepts valid data with defaults", () => {
    const result = createScheduledTransferSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rateMode).toBe("auto");
      expect(result.data.interval).toBe(1);
    }
  });

  it("rejects same source and destination", () => {
    const result = createScheduledTransferSchema.safeParse({
      ...validData,
      fromAccountId: "acc_1",
      toAccountId: "acc_1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects manual rate mode without manualRate", () => {
    const result = createScheduledTransferSchema.safeParse({
      ...validData,
      rateMode: "manual",
    });
    expect(result.success).toBe(false);
  });

  it("accepts manual rate mode with valid rate", () => {
    const result = createScheduledTransferSchema.safeParse({
      ...validData,
      rateMode: "manual",
      manualRate: 1.15,
    });
    expect(result.success).toBe(true);
  });

  it("rejects final mode without finalAmount", () => {
    const result = createScheduledTransferSchema.safeParse({
      ...validData,
      rateMode: "final",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = createScheduledTransferSchema.safeParse({
      ...validData,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid frequency", () => {
    const result = createScheduledTransferSchema.safeParse({
      ...validData,
      frequency: "yearly",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Report schemas ─────────────────────────────────────────────────

describe("createReportSchema", () => {
  it("accepts valid report", () => {
    const result = createReportSchema.safeParse({
      name: "Monthly Expenses",
      filters: { category: "food", dateRange: "30d" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe("csv");
      expect(result.data.scheduleEnabled).toBe(false);
    }
  });

  it("rejects empty name", () => {
    const result = createReportSchema.safeParse({
      name: "",
      filters: {},
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid formats", () => {
    for (const format of ["csv", "json", "pdf"]) {
      const result = createReportSchema.safeParse({
        name: "Test",
        filters: {},
        format,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateReportSchema", () => {
  it("accepts empty update", () => {
    const result = updateReportSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid format", () => {
    const result = updateReportSchema.safeParse({ format: "xlsx" });
    expect(result.success).toBe(false);
  });
});

// ─── Space schemas ──────────────────────────────────────────────────

describe("createSpaceSchema", () => {
  it("accepts valid space", () => {
    const result = createSpaceSchema.safeParse({ name: "Family Budget" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createSpaceSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("inviteMemberSchema", () => {
  it("accepts valid invite with default role", () => {
    const result = inviteMemberSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("viewer");
    }
  });

  it("rejects invalid email", () => {
    const result = inviteMemberSchema.safeParse({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = inviteMemberSchema.safeParse({
      email: "user@example.com",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });

  it("accepts editor role", () => {
    const result = inviteMemberSchema.safeParse({
      email: "user@example.com",
      role: "editor",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Auth schemas ───────────────────────────────────────────────────

describe("registerOptionsSchema", () => {
  it("accepts valid registration", () => {
    const result = registerOptionsSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = registerOptionsSchema.safeParse({
      email: "john@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registerOptionsSchema.safeParse({
      name: "John",
      email: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding max length", () => {
    const result = registerOptionsSchema.safeParse({
      name: "a".repeat(201),
      email: "john@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("trims name whitespace", () => {
    const result = registerOptionsSchema.safeParse({
      name: "  John Doe  ",
      email: "john@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John Doe");
    }
  });
});

describe("loginOptionsSchema", () => {
  it("accepts valid email", () => {
    const result = loginOptionsSchema.safeParse({ email: "user@test.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginOptionsSchema.safeParse({ email: "notanemail" });
    expect(result.success).toBe(false);
  });

  it("rejects email exceeding max length", () => {
    const result = loginOptionsSchema.safeParse({
      email: "a".repeat(250) + "@test.com",
    });
    expect(result.success).toBe(false);
  });
});
