import { z } from "zod";

// ─── Shared primitives ──────────────────────────────────────────────

const positiveNumber = z.number().positive("Must be a positive number");
const nonNegativeNumber = z.number().min(0, "Must be non-negative");
const trimmedString = z.string().trim().min(1, "Must not be empty").max(500, "Too long (max 500 chars)");
const optionalTrimmedString = z.string().trim().max(500, "Too long (max 500 chars)").optional().nullable();
const currency = z.string().trim().min(1).max(10, "Currency code too long").default("USD");
const paginationLimit = z.coerce.number().int().min(1).max(200).default(50);
const paginationOffset = z.coerce.number().int().min(0).default(0);

// ─── Account schemas ────────────────────────────────────────────────

export const createAccountSchema = z.object({
  name: trimmedString,
  type: z.enum(["cash", "bank", "wallet", "credit"], "Account type must be one of: cash, bank, wallet, credit"),
  currency: currency.optional(),
  balance: z.number().optional().default(0),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  lowBalanceThreshold: z.union([z.number().min(0), z.string().transform(v => {
    const n = parseFloat(v);
    if (isNaN(n) || n < 0) throw new Error("Must be a non-negative number");
    return n;
  })]).optional().nullable(),
});

export const updateAccountSchema = z.object({
  name: trimmedString.optional(),
  type: z.enum(["cash", "bank", "wallet", "credit"], "Account type must be one of: cash, bank, wallet, credit").optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  balance: z.number().optional(),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  isArchived: z.boolean().optional(),
  lowBalanceThreshold: z.union([
    z.null(),
    z.number().min(0),
    z.string().transform(v => {
      const n = parseFloat(v);
      if (isNaN(n) || n < 0) throw new Error("Must be a non-negative number");
      return n;
    }),
  ]).optional().nullable(),
});

// ─── Transaction schemas ────────────────────────────────────────────

export const createTransactionSchema = z.object({
  type: z.enum(["expense", "income", "transfer"], "Type must be one of: expense, income, transfer"),
  amount: positiveNumber,
  currency: currency.optional(),
  description: optionalTrimmedString,
  date: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  fromAccountId: z.string().optional().nullable(),
  toAccountId: z.string().optional().nullable(),
  exchangeRate: z.number().positive().optional().nullable(),
  toAmount: z.number().positive().optional().nullable(),
  source: optionalTrimmedString,
  isRecurring: z.boolean().optional().default(false),
  recurringFrequency: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
  receiptId: z.string().optional().nullable(),
});

export const transactionQuerySchema = z.object({
  type: z.enum(["expense", "income", "transfer"]).optional(),
  accountId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: paginationLimit,
  offset: paginationOffset,
});

// ─── Scheduled Transfer schemas ─────────────────────────────────────

export const createScheduledTransferSchema = z.object({
  fromAccountId: z.string().min(1, "Source account is required"),
  toAccountId: z.string().min(1, "Destination account is required"),
  amount: positiveNumber,
  rateMode: z.enum(["auto", "manual", "final"]).optional().default("auto"),
  manualRate: z.number().positive().optional().nullable(),
  finalAmount: z.number().positive().optional().nullable(),
  description: optionalTrimmedString,
  frequency: z.enum(["daily", "weekly", "monthly"], "Frequency must be one of: daily, weekly, monthly"),
  interval: z.coerce.number().int().min(1).max(365).default(1),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
}).refine(data => data.fromAccountId !== data.toAccountId, {
  message: "Source and destination accounts must be different",
  path: ["toAccountId"],
}).refine(data => {
  if (data.rateMode === "manual") return typeof data.manualRate === "number" && data.manualRate > 0;
  return true;
}, {
  message: "Manual rate must be a positive number when rate mode is 'manual'",
  path: ["manualRate"],
}).refine(data => {
  if (data.rateMode === "final") return typeof data.finalAmount === "number" && data.finalAmount > 0;
  return true;
}, {
  message: "Final amount must be a positive number when rate mode is 'final'",
  path: ["finalAmount"],
});

// ─── Report schemas ─────────────────────────────────────────────────

export const createReportSchema = z.object({
  name: trimmedString,
  description: optionalTrimmedString,
  format: z.enum(["csv", "json", "pdf"]).optional().default("csv"),
  filters: z.record(z.string(), z.unknown()).refine(val => val !== null && typeof val === "object", {
    message: "Filters must be an object",
  }),
  scheduleEnabled: z.boolean().optional().default(false),
  scheduleFrequency: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
  scheduleDay: z.number().int().min(0).max(31).optional().nullable(),
  scheduleTime: z.string().max(10).optional().nullable(),
});

export const updateReportSchema = z.object({
  name: trimmedString.optional(),
  description: optionalTrimmedString,
  format: z.enum(["csv", "json", "pdf"]).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  scheduleEnabled: z.boolean().optional(),
  scheduleFrequency: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
  scheduleDay: z.number().int().min(0).max(31).optional().nullable(),
  scheduleTime: z.string().max(10).optional().nullable(),
});

// ─── Notification schemas ───────────────────────────────────────────

export const notificationQuerySchema = z.object({
  limit: paginationLimit.default(50),
  offset: paginationOffset,
  unreadOnly: z.coerce.boolean().optional().default(false),
});

// ─── Space schemas ──────────────────────────────────────────────────

export const createSpaceSchema = z.object({
  name: trimmedString,
  description: optionalTrimmedString,
});

export const updateSpaceSchema = z.object({
  name: trimmedString.optional(),
  description: optionalTrimmedString,
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
  role: z.enum(["editor", "viewer"], "Role must be 'editor' or 'viewer'").default("viewer"),
});

// ─── Auth schemas ───────────────────────────────────────────────────

export const registerOptionsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name too long"),
  email: z.string().email("Invalid email format").max(255, "Email too long"),
});

export const loginOptionsSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
});

// ─── Shared utility ─────────────────────────────────────────────────

export { positiveNumber, nonNegativeNumber, paginationLimit, paginationOffset };
