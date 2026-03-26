/**
 * Low balance warning detection.
 * Checks if an account balance is below its configured threshold
 * and creates a notification if one hasn't been sent recently (within 24h).
 */

import { db } from "@/lib/db";

const COOLDOWN_HOURS = 24;

/**
 * Check a single account for low balance and create notification if needed.
 * Returns true if a notification was created.
 */
export async function checkLowBalance(accountId: string): Promise<boolean> {
  const account = await db.account.findUnique({
    where: { id: accountId },
  });

  if (!account || account.lowBalanceThreshold === null) {
    return false;
  }

  // Only trigger if balance is at or below the threshold
  if (account.balance > account.lowBalanceThreshold) {
    return false;
  }

  // Check for recent notification to avoid spam
  const cooldownDate = new Date(
    Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000
  );

  const recentNotification = await db.notification.findFirst({
    where: {
      userId: account.userId,
      type: "low_balance",
      createdAt: { gte: cooldownDate },
      metadata: { contains: account.id },
    },
  });

  if (recentNotification) {
    return false;
  }

  // Create low balance notification
  await db.notification.create({
    data: {
      userId: account.userId,
      spaceId: account.spaceId,
      type: "low_balance",
      title: `Low balance: ${account.name}`,
      message: `Your ${account.name} account balance is ${account.currency} ${account.balance.toFixed(2)}, which is below your alert threshold of ${account.currency} ${account.lowBalanceThreshold.toFixed(2)}.`,
      priority: "high",
      metadata: JSON.stringify({
        accountId: account.id,
        accountName: account.name,
        balance: account.balance,
        threshold: account.lowBalanceThreshold,
        currency: account.currency,
      }),
    },
  });

  return true;
}

/**
 * Check all accounts for a user for low balance warnings.
 * Returns number of notifications created.
 */
export async function checkAllLowBalances(userId: string): Promise<number> {
  const accounts = await db.account.findMany({
    where: {
      userId,
      isArchived: false,
      lowBalanceThreshold: { not: null },
    },
  });

  let created = 0;
  for (const account of accounts) {
    const notified = await checkLowBalance(account.id);
    if (notified) created++;
  }

  return created;
}
