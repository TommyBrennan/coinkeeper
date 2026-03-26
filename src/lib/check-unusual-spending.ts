/**
 * Unusual spending alert detection.
 * Compares recent spending against historical averages to detect anomalies.
 * Uses statistical analysis per category and per-transaction size.
 * Optionally uses AI to generate human-readable explanations.
 */

import { db } from "@/lib/db";
import { sendPushForNotification } from "@/lib/push-notifications";

const COOLDOWN_HOURS = 24;
const HISTORY_DAYS = 90;
const RECENT_DAYS = 7;
const CATEGORY_SPIKE_MULTIPLIER = 2.0; // Alert if spending > 2x weekly average
const LARGE_TRANSACTION_MULTIPLIER = 3.0; // Alert if single txn > 3x average

interface SpendingAnomaly {
  type: "category_spike" | "large_transaction";
  categoryName?: string;
  categoryId?: string;
  recentAmount: number;
  averageAmount: number;
  multiplier: number;
  currency: string;
  transactionId?: string;
  description?: string;
}

/**
 * Check for unusual spending patterns after a new expense is created.
 * Returns true if a notification was created.
 */
export async function checkUnusualSpending(
  userId: string,
  transactionId: string,
  spaceId?: string | null
): Promise<boolean> {
  try {
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: { category: true, fromAccount: true },
    });

    if (!transaction || transaction.type !== "expense") {
      return false;
    }

    const anomalies: SpendingAnomaly[] = [];
    const currency = transaction.fromAccount?.currency || transaction.currency;

    // Check 1: Is this a single large transaction?
    const largeTxnAnomaly = await checkLargeTransaction(
      userId,
      transaction.amount,
      transaction.id,
      transaction.description,
      currency
    );
    if (largeTxnAnomaly) {
      anomalies.push(largeTxnAnomaly);
    }

    // Check 2: Is spending in this category spiking?
    if (transaction.categoryId) {
      const categoryAnomaly = await checkCategorySpike(
        userId,
        transaction.categoryId,
        currency
      );
      if (categoryAnomaly) {
        anomalies.push(categoryAnomaly);
      }
    }

    if (anomalies.length === 0) {
      return false;
    }

    // Check cooldown: don't spam notifications
    const cooldownDate = new Date(
      Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000
    );

    // For category spikes, cooldown per category
    // For large transactions, cooldown per user (one large txn alert per 24h)
    for (const anomaly of anomalies) {
      const cooldownKey =
        anomaly.type === "category_spike" && anomaly.categoryId
          ? anomaly.categoryId
          : "large_transaction";

      const recentNotification = await db.notification.findFirst({
        where: {
          userId,
          type: "unusual_spending",
          createdAt: { gte: cooldownDate },
          metadata: { contains: cooldownKey },
        },
      });

      if (recentNotification) {
        continue; // Skip this anomaly, already notified
      }

      // Create notification
      const { title, message } = formatAnomalyNotification(anomaly);
      const priority = anomaly.multiplier >= 4 ? "high" : "medium";

      await db.notification.create({
        data: {
          userId,
          spaceId: spaceId || null,
          type: "unusual_spending",
          title,
          message,
          priority,
          metadata: JSON.stringify({
            anomalyType: anomaly.type,
            cooldownKey,
            categoryId: anomaly.categoryId || null,
            categoryName: anomaly.categoryName || null,
            recentAmount: anomaly.recentAmount,
            averageAmount: anomaly.averageAmount,
            multiplier: Math.round(anomaly.multiplier * 10) / 10,
            currency: anomaly.currency,
            transactionId: anomaly.transactionId || null,
          }),
        },
      });

      // Send push notification
      sendPushForNotification(userId, {
        type: "unusual_spending",
        title,
        message,
        priority,
      }).catch(() => {}); // fire-and-forget

      return true; // Created at least one notification
    }

    return false;
  } catch (error) {
    console.error("Unusual spending check failed:", error);
    return false;
  }
}

/**
 * Check if a single transaction is unusually large compared to user's history.
 */
async function checkLargeTransaction(
  userId: string,
  amount: number,
  transactionId: string,
  description: string | null,
  currency: string
): Promise<SpendingAnomaly | null> {
  const historyStart = new Date(
    Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000
  );

  // Get average expense amount over history period
  const result = await db.transaction.aggregate({
    where: {
      userId,
      type: "expense",
      date: { gte: historyStart },
      // Exclude the current transaction
      id: { not: transactionId },
    },
    _avg: { amount: true },
    _count: { amount: true },
  });

  const avgAmount = result._avg.amount;
  const count = result._count.amount;

  // Need at least 10 historical transactions to compare
  if (!avgAmount || count < 10) {
    return null;
  }

  const multiplier = amount / avgAmount;

  if (multiplier >= LARGE_TRANSACTION_MULTIPLIER) {
    return {
      type: "large_transaction",
      recentAmount: amount,
      averageAmount: Math.round(avgAmount * 100) / 100,
      multiplier,
      currency,
      transactionId,
      description: description || undefined,
    };
  }

  return null;
}

/**
 * Check if spending in a category this week is unusually high.
 */
async function checkCategorySpike(
  userId: string,
  categoryId: string,
  currency: string
): Promise<SpendingAnomaly | null> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  const historyStart = new Date(
    now.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000
  );

  // Get this week's spending in the category
  const recentResult = await db.transaction.aggregate({
    where: {
      userId,
      type: "expense",
      categoryId,
      date: { gte: weekStart },
    },
    _sum: { amount: true },
  });

  const recentSpending = recentResult._sum.amount || 0;

  // Get historical weekly average for this category (excluding this week)
  const historyResult = await db.transaction.aggregate({
    where: {
      userId,
      type: "expense",
      categoryId,
      date: { gte: historyStart, lt: weekStart },
    },
    _sum: { amount: true },
  });

  const historicalTotal = historyResult._sum.amount || 0;

  // Calculate number of weeks in history period
  const historyWeeks = Math.max(
    1,
    (weekStart.getTime() - historyStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const weeklyAverage = historicalTotal / historyWeeks;

  // Need meaningful historical data
  if (weeklyAverage < 1) {
    return null; // Not enough history to compare
  }

  const multiplier = recentSpending / weeklyAverage;

  if (multiplier >= CATEGORY_SPIKE_MULTIPLIER) {
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });

    return {
      type: "category_spike",
      categoryName: category?.name || "Unknown",
      categoryId,
      recentAmount: Math.round(recentSpending * 100) / 100,
      averageAmount: Math.round(weeklyAverage * 100) / 100,
      multiplier,
      currency,
    };
  }

  return null;
}

/**
 * Format anomaly into notification title and message.
 */
function formatAnomalyNotification(anomaly: SpendingAnomaly): {
  title: string;
  message: string;
} {
  const mult = Math.round(anomaly.multiplier * 10) / 10;

  if (anomaly.type === "large_transaction") {
    const desc = anomaly.description
      ? ` for "${anomaly.description}"`
      : "";
    return {
      title: "Unusually large expense",
      message: `You spent ${anomaly.currency} ${anomaly.recentAmount.toFixed(2)}${desc}, which is ${mult}x your average expense of ${anomaly.currency} ${anomaly.averageAmount.toFixed(2)}.`,
    };
  }

  // category_spike
  return {
    title: `Spending spike: ${anomaly.categoryName}`,
    message: `Your ${anomaly.categoryName} spending this week is ${anomaly.currency} ${anomaly.recentAmount.toFixed(2)}, which is ${mult}x your weekly average of ${anomaly.currency} ${anomaly.averageAmount.toFixed(2)}.`,
  };
}

/**
 * Scan all recent expenses for a user and check for anomalies.
 * Used by the manual API trigger. Returns number of notifications created.
 */
export async function checkRecentSpendingAnomalies(
  userId: string
): Promise<number> {
  const weekStart = new Date(
    Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000
  );

  // Get recent expense transactions
  const recentExpenses = await db.transaction.findMany({
    where: {
      userId,
      type: "expense",
      date: { gte: weekStart },
    },
    include: { fromAccount: true },
    orderBy: { date: "desc" },
    take: 50,
  });

  let created = 0;
  for (const txn of recentExpenses) {
    const notified = await checkUnusualSpending(
      userId,
      txn.id,
      txn.fromAccount?.spaceId
    );
    if (notified) created++;
  }

  return created;
}
