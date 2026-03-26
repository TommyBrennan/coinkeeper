/**
 * Expense logging reminder detection.
 * Creates a notification when user hasn't logged any transactions
 * for their configured reminder period.
 */

import { db } from "@/lib/db";

const COOLDOWN_HOURS = 24;

/**
 * Check if a user needs an expense logging reminder.
 * Returns true if a notification was created.
 */
export async function checkExpenseReminder(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, reminderDays: true },
  });

  if (!user || user.reminderDays === null) {
    return false;
  }

  // Find the most recent transaction
  const lastTransaction = await db.transaction.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const now = new Date();
  const thresholdDate = new Date(
    now.getTime() - user.reminderDays * 24 * 60 * 60 * 1000
  );

  // If there's a recent transaction within the reminder period, no reminder needed
  if (lastTransaction && lastTransaction.date > thresholdDate) {
    return false;
  }

  // Check for recent reminder notification to avoid spam
  const cooldownDate = new Date(
    now.getTime() - COOLDOWN_HOURS * 60 * 60 * 1000
  );

  const recentReminder = await db.notification.findFirst({
    where: {
      userId,
      type: "expense_reminder",
      createdAt: { gte: cooldownDate },
    },
  });

  if (recentReminder) {
    return false;
  }

  // Calculate how many days since last transaction
  const daysSinceLastTransaction = lastTransaction
    ? Math.floor(
        (now.getTime() - lastTransaction.date.getTime()) / (24 * 60 * 60 * 1000)
      )
    : null;

  const message = daysSinceLastTransaction !== null
    ? `You haven't logged any transactions in ${daysSinceLastTransaction} days. Don't forget to track your expenses!`
    : `You haven't logged any transactions yet. Start tracking your expenses to get insights!`;

  await db.notification.create({
    data: {
      userId,
      type: "expense_reminder",
      title: "Time to log your expenses",
      message,
      priority: "low",
      metadata: JSON.stringify({
        daysSinceLastTransaction,
        reminderDays: user.reminderDays,
      }),
    },
  });

  return true;
}
