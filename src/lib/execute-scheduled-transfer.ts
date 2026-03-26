/**
 * Core logic for executing a single scheduled transfer.
 * Creates a transfer transaction, updates account balances, and advances the schedule.
 */

import { db } from "@/lib/db";
import { fetchExchangeRate } from "@/lib/exchange-rate";
import { calculateNextExecution } from "@/lib/schedule";
import { checkLowBalance } from "@/lib/check-low-balance";
import { sendPushForNotification } from "@/lib/push-notifications";

export interface ExecutionResult {
  scheduleId: string;
  transactionId: string;
  amount: number;
  toAmount: number;
  exchangeRate: number;
  fromAccountId: string;
  toAccountId: string;
  nextExecution: Date;
  deactivated: boolean;
}

export interface ExecutionError {
  scheduleId: string;
  error: string;
}

/**
 * Execute a single scheduled transfer by ID.
 * Returns the execution result or throws an error string.
 */
export async function executeScheduledTransfer(
  scheduleId: string,
  userId: string
): Promise<ExecutionResult> {
  // Load schedule with accounts
  const schedule = await db.scheduledTransfer.findFirst({
    where: { id: scheduleId, userId },
    include: {
      fromAccount: true,
      toAccount: true,
    },
  });

  if (!schedule) {
    throw new Error("Scheduled transfer not found");
  }

  if (!schedule.isActive) {
    throw new Error("Scheduled transfer is paused");
  }

  // Determine exchange rate based on rateMode
  let exchangeRate: number;
  let toAmount: number;

  const sameCurrency =
    schedule.fromAccount.currency === schedule.toAccount.currency;

  if (sameCurrency) {
    exchangeRate = 1;
    toAmount = schedule.amount;
  } else if (schedule.rateMode === "manual" && schedule.manualRate) {
    exchangeRate = schedule.manualRate;
    toAmount = schedule.amount * exchangeRate;
  } else if (schedule.rateMode === "final" && schedule.finalAmount) {
    toAmount = schedule.finalAmount;
    exchangeRate = schedule.finalAmount / schedule.amount;
  } else {
    // Auto mode: fetch live rate
    const rate = await fetchExchangeRate(
      schedule.fromAccount.currency,
      schedule.toAccount.currency
    );
    if (rate === null) {
      throw new Error(
        `Failed to fetch exchange rate for ${schedule.fromAccount.currency} → ${schedule.toAccount.currency}`
      );
    }
    exchangeRate = rate;
    toAmount = schedule.amount * rate;
  }

  // Round toAmount to 2 decimal places
  toAmount = Math.round(toAmount * 100) / 100;

  const now = new Date();

  // Calculate next execution
  const nextExecution = calculateNextExecution(
    schedule.frequency,
    schedule.interval,
    schedule.dayOfWeek,
    schedule.dayOfMonth,
    now
  );

  // Check if schedule should be deactivated (past endDate)
  const deactivated =
    schedule.endDate !== null && nextExecution > schedule.endDate;

  // Execute atomically: create transaction + update balances + advance schedule
  const result = await db.$transaction(async (tx) => {
    // Create transfer transaction
    const txn = await tx.transaction.create({
      data: {
        userId,
        type: "transfer",
        amount: schedule.amount,
        currency: schedule.fromAccount.currency,
        description:
          schedule.description ||
          `Scheduled transfer: ${schedule.fromAccount.name} → ${schedule.toAccount.name}`,
        date: now,
        fromAccountId: schedule.fromAccountId,
        toAccountId: schedule.toAccountId,
        exchangeRate,
        toAmount,
        isRecurring: true,
      },
    });

    // Update account balances
    await tx.account.update({
      where: { id: schedule.fromAccountId },
      data: { balance: { decrement: schedule.amount } },
    });

    await tx.account.update({
      where: { id: schedule.toAccountId },
      data: { balance: { increment: toAmount } },
    });

    // Advance the schedule
    await tx.scheduledTransfer.update({
      where: { id: schedule.id },
      data: {
        lastExecution: now,
        executionCount: { increment: 1 },
        nextExecution,
        isActive: !deactivated,
      },
    });

    return txn;
  });

  // Check low balance on source account (fire and forget)
  checkLowBalance(schedule.fromAccountId).catch(() => {});

  // Create transfer confirmation notification
  const fromName = schedule.fromAccount.name;
  const toName = schedule.toAccount.name;
  const fromCurrency = schedule.fromAccount.currency;
  const toCurrency = schedule.toAccount.currency;
  const isCrossCurrency = fromCurrency !== toCurrency;

  let message = `Transferred ${fromCurrency} ${schedule.amount.toFixed(2)} from ${fromName} to ${toName}.`;
  if (isCrossCurrency) {
    message += ` Received ${toCurrency} ${toAmount.toFixed(2)} (rate: ${exchangeRate.toFixed(4)}).`;
  }
  if (deactivated) {
    message += " This was the final scheduled execution — the schedule is now complete.";
  } else {
    message += ` Next execution: ${nextExecution.toLocaleDateString()}.`;
  }

  const title = `Scheduled transfer executed: ${fromName} → ${toName}`;
  const priority = "medium";

  db.notification
    .create({
      data: {
        userId,
        spaceId: schedule.fromAccount.spaceId,
        type: "transfer_confirmation",
        title,
        message,
        priority,
        metadata: JSON.stringify({
          scheduleId: schedule.id,
          transactionId: result.id,
          fromAccountId: schedule.fromAccountId,
          toAccountId: schedule.toAccountId,
          amount: schedule.amount,
          toAmount,
          exchangeRate,
          deactivated,
        }),
      },
    })
    .then(() => {
      // Send push notification after in-app notification is created
      sendPushForNotification(userId, {
        type: "transfer_confirmation",
        title,
        message,
        priority,
      }).catch(() => {});
    })
    .catch(() => {});

  return {
    scheduleId: schedule.id,
    transactionId: result.id,
    amount: schedule.amount,
    toAmount,
    exchangeRate,
    fromAccountId: schedule.fromAccountId,
    toAccountId: schedule.toAccountId,
    nextExecution,
    deactivated,
  };
}

/**
 * Execute all due scheduled transfers for a user.
 * Returns arrays of successes and failures.
 */
export async function executeDueScheduledTransfers(userId: string): Promise<{
  executed: ExecutionResult[];
  errors: ExecutionError[];
  skipped: number;
}> {
  const now = new Date();

  // Find all active schedules that are due
  const dueSchedules = await db.scheduledTransfer.findMany({
    where: {
      userId,
      isActive: true,
      nextExecution: { lte: now },
    },
    orderBy: { nextExecution: "asc" },
  });

  const executed: ExecutionResult[] = [];
  const errors: ExecutionError[] = [];

  for (const schedule of dueSchedules) {
    try {
      const result = await executeScheduledTransfer(schedule.id, userId);
      executed.push(result);
    } catch (err) {
      errors.push({
        scheduleId: schedule.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { executed, errors, skipped: 0 };
}
