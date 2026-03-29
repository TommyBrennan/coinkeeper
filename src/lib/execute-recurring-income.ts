/**
 * Core logic for executing recurring income transactions.
 * Finds due RecurringRules linked to income transactions, creates new income
 * transactions, updates account balances, and advances the schedule.
 */

import { db } from "@/lib/db";
import { calculateNextExecution } from "@/lib/schedule";
import { sendPushForNotification } from "@/lib/push-notifications";

export interface RecurringIncomeResult {
  ruleId: string;
  transactionId: string;
  amount: number;
  currency: string;
  accountId: string;
  nextExecution: Date;
  deactivated: boolean;
}

export interface RecurringIncomeError {
  ruleId: string;
  error: string;
}

/**
 * Execute a single recurring income rule by ID.
 * Finds the most recent income transaction linked to this rule,
 * creates a new transaction with the same details, and advances the schedule.
 */
export async function executeRecurringIncome(
  ruleId: string,
  userId: string
): Promise<RecurringIncomeResult> {
  // Load the rule and its most recent income transaction (as template)
  const rule = await db.recurringRule.findUnique({
    where: { id: ruleId },
    include: {
      transactions: {
        where: { type: "income", userId },
        orderBy: { date: "desc" },
        take: 1,
        include: {
          toAccount: true,
        },
      },
    },
  });

  if (!rule) {
    throw new Error("Recurring rule not found");
  }

  if (!rule.isActive) {
    throw new Error("Recurring rule is not active");
  }

  const templateTxn = rule.transactions[0];
  if (!templateTxn) {
    throw new Error("No income transaction found for this recurring rule");
  }

  if (!templateTxn.toAccountId || !templateTxn.toAccount) {
    throw new Error("Recurring income has no target account");
  }

  const now = new Date();

  // Calculate next execution using the schedule library
  const nextExecution = calculateNextExecution(
    rule.frequency,
    rule.interval,
    null, // RecurringRule doesn't have dayOfWeek
    null, // RecurringRule doesn't have dayOfMonth
    now
  );

  // Check if rule should be deactivated (past endDate)
  const deactivated =
    rule.endDate !== null && nextExecution > rule.endDate;

  // Execute atomically: create transaction + update balance + advance rule
  const result = await db.$transaction(async (tx) => {
    // Create new income transaction based on template
    const txn = await tx.transaction.create({
      data: {
        userId,
        type: "income",
        amount: templateTxn.amount,
        currency: templateTxn.currency,
        description: templateTxn.description,
        source: templateTxn.source,
        date: now,
        categoryId: templateTxn.categoryId,
        toAccountId: templateTxn.toAccountId,
        isRecurring: true,
        recurringId: rule.id,
      },
    });

    // Update account balance
    await tx.account.update({
      where: { id: templateTxn.toAccountId! },
      data: { balance: { increment: templateTxn.amount } },
    });

    // Advance the recurring rule
    await tx.recurringRule.update({
      where: { id: rule.id },
      data: {
        lastExecution: now,
        nextExecution,
        isActive: !deactivated,
      },
    });

    return txn;
  });

  // Create notification (fire and forget)
  const accountName = templateTxn.toAccount.name;
  const currency = templateTxn.currency;
  const amount = templateTxn.amount;

  let message = `Recurring income of ${currency} ${amount.toFixed(2)} credited to ${accountName}.`;
  if (templateTxn.source) {
    message = `Recurring income from ${templateTxn.source}: ${currency} ${amount.toFixed(2)} credited to ${accountName}.`;
  }
  if (deactivated) {
    message += " This was the final scheduled execution — the recurring rule is now complete.";
  } else {
    message += ` Next: ${nextExecution.toLocaleDateString()}.`;
  }

  const title = `Recurring income: ${currency} ${amount.toFixed(2)}`;

  db.notification
    .create({
      data: {
        userId,
        spaceId: templateTxn.toAccount.spaceId,
        type: "transfer_confirmation",
        title,
        message,
        priority: "low",
        metadata: JSON.stringify({
          ruleId: rule.id,
          transactionId: result.id,
          accountId: templateTxn.toAccountId,
          amount,
          currency,
          deactivated,
        }),
      },
    })
    .then(() => {
      sendPushForNotification(userId, {
        type: "transfer_confirmation",
        title,
        message,
        priority: "low",
      }).catch(() => {});
    })
    .catch(() => {});

  return {
    ruleId: rule.id,
    transactionId: result.id,
    amount: templateTxn.amount,
    currency: templateTxn.currency,
    accountId: templateTxn.toAccountId!,
    nextExecution,
    deactivated,
  };
}

/**
 * Execute all due recurring income rules for a user.
 * Finds active rules where nextExecution <= now, linked to income transactions
 * belonging to the given user.
 */
export async function executeDueRecurringIncome(userId: string): Promise<{
  executed: RecurringIncomeResult[];
  errors: RecurringIncomeError[];
}> {
  const now = new Date();

  // Find due recurring rules linked to this user's income transactions
  const dueRules = await db.recurringRule.findMany({
    where: {
      isActive: true,
      nextExecution: { lte: now },
      transactions: {
        some: {
          userId,
          type: "income",
        },
      },
    },
    orderBy: { nextExecution: "asc" },
  });

  const executed: RecurringIncomeResult[] = [];
  const errors: RecurringIncomeError[] = [];

  for (const rule of dueRules) {
    try {
      const result = await executeRecurringIncome(rule.id, userId);
      executed.push(result);
    } catch (err) {
      errors.push({
        ruleId: rule.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { executed, errors };
}
