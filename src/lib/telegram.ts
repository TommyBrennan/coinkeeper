import { Bot, Context, InlineKeyboard, webhookCallback } from "grammy";
import { db } from "./db";
import { categorizeTransaction } from "./categorize";
import { parseReceiptImage, type ParsedReceipt, type ReceiptLineItem } from "./receipt-parser";
import crypto from "crypto";

// ─── Bot Instance ────────────────────────────────────────────────────

let bot: Bot | null = null;

export function getBot(): Bot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  if (!bot) {
    bot = new Bot(token);
    registerHandlers(bot);
  }
  return bot;
}

export function getWebhookHandler() {
  const b = getBot();
  if (!b) return null;
  return webhookCallback(b, "std/http");
}

// ─── Helpers ─────────────────────────────────────────────────────────

async function getUserByChatId(chatId: string) {
  const link = await db.telegramLink.findUnique({
    where: { chatId },
    include: { user: true },
  });
  return link?.user ?? null;
}

async function requireLinkedUser(ctx: Context): Promise<{ userId: string; userName: string } | null> {
  const chatId = ctx.chat?.id?.toString();
  if (!chatId) return null;

  const user = await getUserByChatId(chatId);
  if (!user) {
    await ctx.reply(
      "Please link your account first. Send /start for instructions."
    );
    return null;
  }
  return { userId: user.id, userName: user.name };
}

// ─── Link Code Generation ───────────────────────────────────────────

export async function generateLinkCode(userId: string): Promise<string> {
  // Delete any existing codes for this user
  await db.telegramLinkCode.deleteMany({ where: { userId } });

  // Generate a 6-character alphanumeric code
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.telegramLinkCode.create({
    data: { userId, code, expiresAt },
  });

  return code;
}

export async function getTelegramLinkStatus(userId: string) {
  const link = await db.telegramLink.findUnique({
    where: { userId },
  });
  return link;
}

export async function unlinkTelegram(userId: string) {
  await db.telegramLink.delete({
    where: { userId },
  }).catch(() => {
    // Ignore if not found
  });
}

// ─── Expense Parsing ────────────────────────────────────────────────

interface ParsedExpense {
  amount: number;
  currency: string | null;
  description: string;
}

const CURRENCY_CODES = new Set([
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD",
  "CNY", "RUB", "INR", "BRL", "KRW", "MXN", "SGD", "HKD",
  "NOK", "SEK", "DKK", "PLN", "CZK", "TRY", "THB", "IDR",
  "MYR", "PHP", "VND", "ZAR", "ILS", "ARS", "CLP", "COP",
  "PEN", "UAH", "KZT", "GEL", "AED", "SAR", "QAR", "BHD",
  "KWD", "OMR", "EGP", "NGN", "KES", "GHS", "TZS",
]);

/**
 * Parse expense text like "Coffee 5.50", "5.50 Coffee", "Lunch 25 EUR", "25.00 EUR groceries"
 * Returns null if no amount is found.
 */
export function parseExpenseText(text: string): ParsedExpense | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Match a number (integer or decimal) anywhere in the text
  const amountRegex = /(\d+(?:[.,]\d{1,2})?)/;
  const match = trimmed.match(amountRegex);
  if (!match) return null;

  const amountStr = match[1].replace(",", ".");
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  // Remove the matched amount from the text
  const amountIndex = match.index!;
  const beforeAmount = trimmed.slice(0, amountIndex).trim();
  const afterAmount = trimmed.slice(amountIndex + match[0].length).trim();

  // Check for currency code adjacent to amount (before or after)
  let currency: string | null = null;
  let remaining = `${beforeAmount} ${afterAmount}`.trim();

  // Check if first word after amount is a currency code
  const afterWords = afterAmount.split(/\s+/);
  if (afterWords.length > 0 && CURRENCY_CODES.has(afterWords[0].toUpperCase())) {
    currency = afterWords[0].toUpperCase();
    afterWords.shift();
    remaining = `${beforeAmount} ${afterWords.join(" ")}`.trim();
  }

  // Check if last word before amount is a currency code
  if (!currency) {
    const beforeWords = beforeAmount.split(/\s+/);
    if (beforeWords.length > 0 && CURRENCY_CODES.has(beforeWords[beforeWords.length - 1].toUpperCase())) {
      currency = beforeWords[beforeWords.length - 1].toUpperCase();
      beforeWords.pop();
      remaining = `${beforeWords.join(" ")} ${afterAmount}`.trim();
    }
  }

  // Clean up description
  const description = remaining.replace(/\s+/g, " ").trim();
  if (!description) {
    return { amount, currency, description: "Expense" };
  }

  return { amount, currency, description };
}

// ─── Pending Expense State ──────────────────────────────────────────

interface PendingExpense {
  userId: string;
  amount: number;
  currency: string | null;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: number; // timestamp for expiry
}

// In-memory store for pending expenses awaiting account selection
// Key: chatId, Value: pending expense data
const pendingExpenses = new Map<string, PendingExpense>();

// Clean up expired entries (older than 5 minutes)
function cleanupPendingExpenses() {
  const now = Date.now();
  const EXPIRY_MS = 5 * 60 * 1000;
  for (const [chatId, pending] of pendingExpenses.entries()) {
    if (now - pending.createdAt > EXPIRY_MS) {
      pendingExpenses.delete(chatId);
    }
  }
}

// ─── Pending Receipt State ──────────────────────────────────────────

interface PendingReceipt {
  userId: string;
  receiptId: string;
  parsed: ParsedReceipt;
  createdAt: number;
}

// In-memory store for pending receipts awaiting confirmation/account selection
const pendingReceipts = new Map<string, PendingReceipt>();

function cleanupPendingReceipts() {
  const now = Date.now();
  const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
  for (const [chatId, pending] of pendingReceipts.entries()) {
    if (now - pending.createdAt > EXPIRY_MS) {
      pendingReceipts.delete(chatId);
    }
  }
}

// ─── Receipt Helpers ────────────────────────────────────────────────

function formatReceiptMessage(parsed: ParsedReceipt): string {
  const lines: string[] = ["\uD83E\uDDFE Receipt parsed!\n"];

  if (parsed.merchant) {
    lines.push(`\uD83C\uDFEA ${parsed.merchant}`);
  }
  if (parsed.date) {
    lines.push(`\uD83D\uDCC5 ${parsed.date}`);
  }
  if (parsed.currency) {
    lines.push(`\uD83D\uDCB1 ${parsed.currency}`);
  }

  if (parsed.lineItems.length > 0) {
    lines.push("");
    lines.push("\uD83D\uDCCB Items:");
    for (const item of parsed.lineItems.slice(0, 15)) {
      const qty = item.quantity > 1 ? ` x${item.quantity}` : "";
      lines.push(`  \u2022 ${item.name}${qty} — ${item.totalPrice.toFixed(2)}`);
    }
    if (parsed.lineItems.length > 15) {
      lines.push(`  ... and ${parsed.lineItems.length - 15} more items`);
    }
  }

  lines.push("");
  if (parsed.subtotal !== null) {
    lines.push(`Subtotal: ${parsed.subtotal.toFixed(2)}`);
  }
  if (parsed.tax !== null) {
    lines.push(`Tax: ${parsed.tax.toFixed(2)}`);
  }
  if (parsed.total !== null) {
    lines.push(`\uD83D\uDCB0 Total: ${parsed.total.toFixed(2)}${parsed.currency ? ` ${parsed.currency}` : ""}`);
  }

  return lines.join("\n");
}

async function createReceiptTransactions(
  userId: string,
  accountId: string,
  receiptId: string,
  parsed: ParsedReceipt,
): Promise<number> {
  const account = await db.account.findFirst({
    where: { id: accountId, userId, isArchived: false },
  });
  if (!account) throw new Error("Account not found");

  const currency = parsed.currency || account.currency;
  const merchant = parsed.merchant || "Receipt";

  // Fetch user categories for AI categorization
  const categories = await db.category.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  const corrections = await db.categoryCorrection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const correctionData = corrections.map((c) => ({
    description: c.description,
    suggestedCategoryId: c.suggestedCategoryId,
    correctedCategoryId: c.correctedCategoryId,
  }));

  let createdCount = 0;
  const items = parsed.lineItems.length > 0
    ? parsed.lineItems
    : parsed.total !== null
      ? [{ name: merchant, quantity: 1, unitPrice: parsed.total, totalPrice: parsed.total } as ReceiptLineItem]
      : [];

  for (const item of items) {
    const description = `${merchant} — ${item.name}`;

    // AI categorization per item
    const catResult = await categorizeTransaction(
      description,
      categories,
      item.totalPrice,
      correctionData,
    );

    let categoryId: string | null = catResult.categoryId;

    if (!categoryId && catResult.isNew && catResult.suggestedName) {
      try {
        const newCat = await db.category.create({
          data: { userId, name: catResult.suggestedName },
        });
        categoryId = newCat.id;
        // Add to local categories list for subsequent items
        categories.push({ id: newCat.id, name: newCat.name });
      } catch {
        const existing = await db.category.findFirst({
          where: { userId, name: catResult.suggestedName },
        });
        if (existing) {
          categoryId = existing.id;
        }
      }
    }

    await db.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId,
          type: "expense",
          amount: item.totalPrice,
          currency,
          description,
          date: parsed.date ? new Date(parsed.date) : new Date(),
          categoryId,
          fromAccountId: accountId,
          receiptId,
        },
      });

      await tx.account.update({
        where: { id: accountId },
        data: { balance: { decrement: item.totalPrice } },
      });
    });

    createdCount++;
  }

  return createdCount;
}

// ─── Transaction Creation ───────────────────────────────────────────

async function createExpenseTransaction(
  userId: string,
  accountId: string,
  amount: number,
  currency: string,
  description: string,
  categoryId: string | null,
) {
  const transaction = await db.$transaction(async (tx) => {
    const txn = await tx.transaction.create({
      data: {
        userId,
        type: "expense",
        amount,
        currency,
        description,
        date: new Date(),
        categoryId,
        fromAccountId: accountId,
      },
      include: {
        category: true,
        fromAccount: { select: { id: true, name: true, currency: true } },
      },
    });

    // Update account balance
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { decrement: amount } },
    });

    return txn;
  });

  return transaction;
}

// ─── Command Handlers ───────────────────────────────────────────────

function registerHandlers(bot: Bot) {
  // /start command
  bot.command("start", async (ctx) => {
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return;

    const user = await getUserByChatId(chatId);
    if (user) {
      await ctx.reply(`Welcome back, ${user.name}! Use /help to see available commands.`);
    } else {
      await ctx.reply(
        "Welcome to CoinKeeper! \u{1F4B0}\n\n" +
        "To get started, link your account:\n" +
        "1\uFE0F\u20E3 Open CoinKeeper web app\n" +
        "2\uFE0F\u20E3 Go to Settings \u2192 Telegram\n" +
        "3\uFE0F\u20E3 Generate a link code\n" +
        "4\uFE0F\u20E3 Send /link <code> here\n\n" +
        "Example: /link ABC123"
      );
    }
  });

  // /link command
  bot.command("link", async (ctx) => {
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return;

    // Check if already linked
    const existingLink = await db.telegramLink.findUnique({
      where: { chatId },
    });
    if (existingLink) {
      await ctx.reply(
        "Your Telegram is already linked to a CoinKeeper account. " +
        "Use /unlink first to change accounts."
      );
      return;
    }

    const code = ctx.match?.trim().toUpperCase();
    if (!code) {
      await ctx.reply("Please provide a link code. Example: /link ABC123");
      return;
    }

    // Find and validate code
    const linkCode = await db.telegramLinkCode.findUnique({
      where: { code },
      include: { user: true },
    });

    if (!linkCode || linkCode.expiresAt < new Date()) {
      // Clean up expired code if it exists
      if (linkCode) {
        await db.telegramLinkCode.delete({ where: { id: linkCode.id } });
      }
      await ctx.reply(
        "Invalid or expired code. Please generate a new one from the web app."
      );
      return;
    }

    // Create the link
    const telegramUser = ctx.from;
    await db.telegramLink.create({
      data: {
        userId: linkCode.userId,
        chatId,
        username: telegramUser?.username ?? null,
      },
    });

    // Clean up used code
    await db.telegramLinkCode.delete({ where: { id: linkCode.id } });

    await ctx.reply(
      `Account linked successfully! Welcome, ${linkCode.user.name}. \u{1F389}\n\n` +
      "Use /help to see available commands."
    );
  });

  // /unlink command
  bot.command("unlink", async (ctx) => {
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return;

    const link = await db.telegramLink.findUnique({
      where: { chatId },
    });

    if (!link) {
      await ctx.reply("Your Telegram account is not linked. Send /start for instructions.");
      return;
    }

    await db.telegramLink.delete({ where: { id: link.id } });
    await ctx.reply("Account unlinked. Send /link <code> to link a different account.");
  });

  // /cancel command — clear pending expense
  bot.command("cancel", async (ctx) => {
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return;

    const linked = await requireLinkedUser(ctx);
    if (!linked) return;

    if (pendingReceipts.has(chatId)) {
      pendingReceipts.delete(chatId);
      await ctx.reply("Receipt processing cancelled.");
    } else if (pendingExpenses.has(chatId)) {
      pendingExpenses.delete(chatId);
      await ctx.reply("Expense entry cancelled.");
    } else {
      await ctx.reply("Nothing to cancel.");
    }
  });

  // /balance command — show account balances
  bot.command("balance", async (ctx) => {
    const linked = await requireLinkedUser(ctx);
    if (!linked) return;

    const accounts = await db.account.findMany({
      where: { userId: linked.userId, isArchived: false, spaceId: null },
      orderBy: { createdAt: "asc" },
    });

    if (accounts.length === 0) {
      await ctx.reply(
        "You don't have any accounts yet.\n" +
        "Create one in the CoinKeeper web app first!"
      );
      return;
    }

    // Build account list
    const lines: string[] = ["\u{1F4B3} Your Accounts\n"];
    const totals: Record<string, number> = {};

    for (const account of accounts) {
      const icon = account.type === "cash" ? "\u{1F4B5}" :
                   account.type === "bank" ? "\u{1F3E6}" :
                   account.type === "credit" ? "\u{1F4B3}" :
                   account.type === "wallet" ? "\u{1F45B}" : "\u{1F4B0}";
      const balanceStr = account.balance.toFixed(2);
      lines.push(`${icon} ${account.name}: ${balanceStr} ${account.currency}`);

      const cur = account.currency.toUpperCase();
      totals[cur] = (totals[cur] || 0) + account.balance;
    }

    // Net worth summary
    lines.push("");
    lines.push("\u{1F4CA} Net Worth:");
    for (const [currency, total] of Object.entries(totals)) {
      lines.push(`  ${total.toFixed(2)} ${currency}`);
    }

    await ctx.reply(lines.join("\n"));
  });

  // /spending command — show spending summary by category
  bot.command("spending", async (ctx) => {
    const linked = await requireLinkedUser(ctx);
    if (!linked) return;

    // Parse period argument
    const arg = (ctx.match?.trim() || "").toLowerCase();
    const now = new Date();
    let fromDate: Date;
    let periodLabel: string;

    if (arg === "week") {
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 7);
      periodLabel = "last 7 days";
    } else if (arg === "year") {
      fromDate = new Date(now.getFullYear(), 0, 1);
      periodLabel = `${now.getFullYear()}`;
    } else {
      // Default: current month
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthName = now.toLocaleString("en-US", { month: "long" });
      periodLabel = `${monthName} ${now.getFullYear()}`;
    }

    // Get user's personal account IDs
    const accounts = await db.account.findMany({
      where: { userId: linked.userId, isArchived: false, spaceId: null },
      select: { id: true },
    });

    if (accounts.length === 0) {
      await ctx.reply("You don't have any accounts yet.");
      return;
    }

    const accountIds = accounts.map((a) => a.id);

    // Fetch expense transactions for the period
    const transactions = await db.transaction.findMany({
      where: {
        type: "expense",
        fromAccountId: { in: accountIds },
        date: { gte: fromDate, lte: now },
      },
      select: {
        amount: true,
        currency: true,
        category: { select: { name: true } },
      },
    });

    if (transactions.length === 0) {
      await ctx.reply(`No expenses found for ${periodLabel}.`);
      return;
    }

    // Group by category
    const categoryTotals: Record<string, number> = {};
    let grandTotal = 0;
    let primaryCurrency = "USD";
    const currencyCount: Record<string, number> = {};

    for (const txn of transactions) {
      const catName = txn.category?.name ?? "Uncategorized";
      categoryTotals[catName] = (categoryTotals[catName] || 0) + txn.amount;
      grandTotal += txn.amount;

      const cur = txn.currency.toUpperCase();
      currencyCount[cur] = (currencyCount[cur] || 0) + 1;
    }

    // Determine primary currency
    let maxCount = 0;
    for (const [cur, count] of Object.entries(currencyCount)) {
      if (count > maxCount) {
        maxCount = count;
        primaryCurrency = cur;
      }
    }

    // Sort categories by total descending
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    const lines: string[] = [`\u{1F4CA} Spending — ${periodLabel}\n`];

    for (const [catName, total] of sorted) {
      const pct = ((total / grandTotal) * 100).toFixed(0);
      lines.push(`\u{1F3F7}\uFE0F ${catName}: ${total.toFixed(2)} ${primaryCurrency} (${pct}%)`);
    }

    lines.push("");
    lines.push(`\u{1F4B8} Total: ${grandTotal.toFixed(2)} ${primaryCurrency}`);
    lines.push(`\u{1F4DD} ${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`);

    await ctx.reply(lines.join("\n"));
  });

  // /help command
  bot.command("help", async (ctx) => {
    const linked = await requireLinkedUser(ctx);
    if (!linked) return;

    await ctx.reply(
      "\u{1F4CB} Available commands:\n\n" +
      "/balance \u2014 View account balances\n" +
      "/spending \u2014 Monthly spending summary\n" +
      "/spending week \u2014 Last 7 days\n" +
      "/spending year \u2014 Year-to-date\n" +
      "/cancel \u2014 Cancel pending entry\n" +
      "/help \u2014 Show this help message\n" +
      "/unlink \u2014 Unlink your Telegram account\n\n" +
      "\u{1F4B8} Quick expense entry:\n" +
      "Just send a message with an amount!\n" +
      'Examples: "Coffee 5.50", "25 EUR Lunch", "Groceries 42.99"\n\n' +
      "\uD83E\uDDFE Receipt scanning:\n" +
      "Send a photo of a receipt and I'll extract the items automatically!"
    );
  });

  // ─── Callback Query Handler (account selection) ───────────────────

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return;

    // Handle account selection for pending expense
    if (data.startsWith("account:")) {
      const accountId = data.slice("account:".length);
      const pending = pendingExpenses.get(chatId);

      if (!pending) {
        await ctx.answerCallbackQuery({ text: "Expense expired. Please try again." });
        try {
          await ctx.editMessageText("This expense entry has expired. Send a new message to try again.");
        } catch {
          // Message may already be edited
        }
        return;
      }

      // Verify the account belongs to the user
      const account = await db.account.findFirst({
        where: { id: accountId, userId: pending.userId, isArchived: false },
      });

      if (!account) {
        await ctx.answerCallbackQuery({ text: "Account not found." });
        return;
      }

      // Use the currency from the parsed expense, falling back to account currency
      const currency = pending.currency || account.currency;

      try {
        const txn = await createExpenseTransaction(
          pending.userId,
          accountId,
          pending.amount,
          currency,
          pending.description,
          pending.categoryId,
        );

        pendingExpenses.delete(chatId);
        await ctx.answerCallbackQuery({ text: "Expense recorded!" });

        const categoryLabel = txn.category?.name ?? "Uncategorized";
        const accountLabel = txn.fromAccount?.name ?? "Unknown";
        try {
          await ctx.editMessageText(
            `\u2705 Expense recorded!\n\n` +
            `\u{1F4B0} ${txn.amount.toFixed(2)} ${txn.currency}\n` +
            `\u{1F4DD} ${txn.description || "Expense"}\n` +
            `\u{1F3F7}\uFE0F ${categoryLabel}\n` +
            `\u{1F4B3} ${accountLabel}`
          );
        } catch {
          // If edit fails, send a new message
          await ctx.reply(
            `\u2705 Expense recorded!\n\n` +
            `\u{1F4B0} ${txn.amount.toFixed(2)} ${txn.currency}\n` +
            `\u{1F4DD} ${txn.description || "Expense"}\n` +
            `\u{1F3F7}\uFE0F ${categoryLabel}\n` +
            `\u{1F4B3} ${accountLabel}`
          );
        }
      } catch (error) {
        console.error("Failed to create expense from Telegram:", error);
        pendingExpenses.delete(chatId);
        await ctx.answerCallbackQuery({ text: "Failed to create expense." });
        try {
          await ctx.editMessageText("Failed to create the expense. Please try again.");
        } catch {
          await ctx.reply("Failed to create the expense. Please try again.");
        }
      }
      return;
    }

    // Handle receipt confirmation
    if (data === "receipt_confirm") {
      const pending = pendingReceipts.get(chatId);
      if (!pending) {
        await ctx.answerCallbackQuery({ text: "Receipt expired. Send the photo again." });
        try {
          await ctx.editMessageText("This receipt has expired. Send the photo again to try.");
        } catch { /* ignore */ }
        return;
      }

      // Fetch user accounts
      const accounts = await db.account.findMany({
        where: { userId: pending.userId, isArchived: false, spaceId: null },
        orderBy: { createdAt: "asc" },
      });

      if (accounts.length === 0) {
        pendingReceipts.delete(chatId);
        await ctx.answerCallbackQuery({ text: "No accounts found." });
        try {
          await ctx.editMessageText("You don't have any accounts. Create one in the web app first!");
        } catch { /* ignore */ }
        return;
      }

      if (accounts.length === 1) {
        // Single account — create transactions immediately
        await ctx.answerCallbackQuery({ text: "Creating transactions..." });
        try {
          const count = await createReceiptTransactions(
            pending.userId,
            accounts[0].id,
            pending.receiptId,
            pending.parsed,
          );
          pendingReceipts.delete(chatId);
          try {
            await ctx.editMessageText(
              `\u2705 Receipt processed!\n\n` +
              `\uD83D\uDCDD ${count} transaction${count !== 1 ? "s" : ""} created\n` +
              `\uD83D\uDCB3 ${accounts[0].name}`
            );
          } catch {
            await ctx.reply(
              `\u2705 Receipt processed! ${count} transaction${count !== 1 ? "s" : ""} created.`
            );
          }
        } catch (error) {
          console.error("Failed to create receipt transactions:", error);
          pendingReceipts.delete(chatId);
          try {
            await ctx.editMessageText("Failed to create transactions. Please try again.");
          } catch {
            await ctx.reply("Failed to create transactions. Please try again.");
          }
        }
        return;
      }

      // Multiple accounts — show account picker
      const keyboard = new InlineKeyboard();
      for (const account of accounts) {
        keyboard.text(
          `${account.name} (${account.currency})`,
          `receipt_account:${account.id}`,
        ).row();
      }
      keyboard.text("\u274C Cancel", "receipt_cancel");

      await ctx.answerCallbackQuery();
      try {
        await ctx.editMessageText(
          formatReceiptMessage(pending.parsed) + "\n\nWhich account should I charge?",
          { reply_markup: keyboard },
        );
      } catch { /* ignore */ }
      return;
    }

    // Handle receipt account selection
    if (data.startsWith("receipt_account:")) {
      const accountId = data.slice("receipt_account:".length);
      const pending = pendingReceipts.get(chatId);

      if (!pending) {
        await ctx.answerCallbackQuery({ text: "Receipt expired. Send the photo again." });
        try {
          await ctx.editMessageText("This receipt has expired. Send the photo again.");
        } catch { /* ignore */ }
        return;
      }

      const account = await db.account.findFirst({
        where: { id: accountId, userId: pending.userId, isArchived: false },
      });

      if (!account) {
        await ctx.answerCallbackQuery({ text: "Account not found." });
        return;
      }

      await ctx.answerCallbackQuery({ text: "Creating transactions..." });
      try {
        const count = await createReceiptTransactions(
          pending.userId,
          accountId,
          pending.receiptId,
          pending.parsed,
        );
        pendingReceipts.delete(chatId);
        try {
          await ctx.editMessageText(
            `\u2705 Receipt processed!\n\n` +
            `\uD83D\uDCDD ${count} transaction${count !== 1 ? "s" : ""} created\n` +
            `\uD83D\uDCB3 ${account.name}`
          );
        } catch {
          await ctx.reply(
            `\u2705 Receipt processed! ${count} transaction${count !== 1 ? "s" : ""} created.`
          );
        }
      } catch (error) {
        console.error("Failed to create receipt transactions:", error);
        pendingReceipts.delete(chatId);
        try {
          await ctx.editMessageText("Failed to create transactions. Please try again.");
        } catch {
          await ctx.reply("Failed to create transactions. Please try again.");
        }
      }
      return;
    }

    // Handle receipt cancel
    if (data === "receipt_cancel") {
      pendingReceipts.delete(chatId);
      await ctx.answerCallbackQuery({ text: "Cancelled." });
      try {
        await ctx.editMessageText("Receipt processing cancelled.");
      } catch {
        await ctx.reply("Receipt processing cancelled.");
      }
      return;
    }

    // Handle cancel button (expense)
    if (data === "cancel_expense") {
      pendingExpenses.delete(chatId);
      await ctx.answerCallbackQuery({ text: "Cancelled." });
      try {
        await ctx.editMessageText("Expense entry cancelled.");
      } catch {
        await ctx.reply("Expense entry cancelled.");
      }
      return;
    }

    await ctx.answerCallbackQuery();
  });

  // ─── Photo Message Handler (receipt scanning) ─────────────────────

  bot.on("message:photo", async (ctx) => {
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return;

    const user = await getUserByChatId(chatId);
    if (!user) {
      await ctx.reply(
        "Please link your account first. Send /start for instructions."
      );
      return;
    }

    // Clean up expired pending receipts
    cleanupPendingReceipts();

    // Get highest resolution photo (last in array)
    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1];

    await ctx.reply("\uD83D\uDD0D Processing receipt... This may take a moment.");

    try {
      // Download the photo from Telegram
      const file = await ctx.api.getFile(photo.file_id);
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download photo: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const base64 = buffer.toString("base64");

      // Determine MIME type from file extension
      const ext = file.file_path?.split(".").pop()?.toLowerCase() || "jpg";
      const mimeMap: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
      };
      const mimeType = mimeMap[ext] || "image/jpeg";

      // Parse receipt using AI
      const parsed = await parseReceiptImage(base64, mimeType);

      // Check if parsing produced useful results
      if (!parsed.total && parsed.lineItems.length === 0) {
        await ctx.reply(
          "\u26A0\uFE0F I couldn't extract receipt data from this photo.\n\n" +
          "Tips for better results:\n" +
          "\u2022 Make sure the receipt is well-lit\n" +
          "\u2022 Avoid shadows and glare\n" +
          "\u2022 Include the full receipt in the frame\n" +
          "\u2022 Try taking a closer photo"
        );
        return;
      }

      // Store receipt in database
      const receipt = await db.receipt.create({
        data: {
          imagePath: `telegram://${photo.file_id}`,
          merchant: parsed.merchant,
          total: parsed.total,
          currency: parsed.currency,
          rawText: parsed.rawText,
          parsedData: JSON.stringify(parsed),
          processedAt: new Date(),
        },
      });

      // Store pending receipt for confirmation
      pendingReceipts.set(chatId, {
        userId: user.id,
        receiptId: receipt.id,
        parsed,
        createdAt: Date.now(),
      });

      // Show parsed data with confirm/cancel buttons
      const message = formatReceiptMessage(parsed);
      const keyboard = new InlineKeyboard()
        .text("\u2705 Confirm", "receipt_confirm")
        .text("\u274C Cancel", "receipt_cancel");

      await ctx.reply(message, { reply_markup: keyboard });
    } catch (error) {
      console.error("Receipt photo processing failed:", error);
      await ctx.reply(
        "\u274C Failed to process the receipt photo. Please try again.\n\n" +
        "If the problem persists, try sending a clearer photo."
      );
    }
  });

  // ─── Text Message Handler (expense entry) ─────────────────────────

  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return;

    const user = await getUserByChatId(chatId);
    if (!user) {
      await ctx.reply(
        "Please link your account first. Send /start for instructions."
      );
      return;
    }

    // Clean up expired pending expenses periodically
    cleanupPendingExpenses();

    const text = ctx.message.text;

    // Skip if it looks like a command (shouldn't reach here, but safety check)
    if (text.startsWith("/")) return;

    // Parse expense text
    const parsed = parseExpenseText(text);
    if (!parsed) {
      await ctx.reply(
        "I couldn't find an amount in your message.\n\n" +
        "\u{1F4A1} To log an expense, include an amount:\n" +
        '"Coffee 5.50"\n' +
        '"25 EUR Lunch"\n' +
        '"Groceries 42.99"'
      );
      return;
    }

    // Fetch user's accounts (non-archived)
    const accounts = await db.account.findMany({
      where: { userId: user.id, isArchived: false, spaceId: null },
      orderBy: { createdAt: "asc" },
    });

    if (accounts.length === 0) {
      await ctx.reply(
        "You don't have any accounts yet. " +
        "Create one in the CoinKeeper web app first!"
      );
      return;
    }

    // Run AI categorization
    const categories = await db.category.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
    });

    // Fetch recent corrections for better AI accuracy
    const corrections = await db.categoryCorrection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const catResult = await categorizeTransaction(
      parsed.description,
      categories,
      parsed.amount,
      corrections.map((c) => ({
        description: c.description,
        suggestedCategoryId: c.suggestedCategoryId,
        correctedCategoryId: c.correctedCategoryId,
      })),
    );

    // Resolve category: use existing or create new one
    let categoryId: string | null = catResult.categoryId;
    let categoryName: string | null = catResult.suggestedName;

    if (!categoryId && catResult.isNew && catResult.suggestedName) {
      // Create the new category
      try {
        const newCat = await db.category.create({
          data: {
            userId: user.id,
            name: catResult.suggestedName,
          },
        });
        categoryId = newCat.id;
        categoryName = newCat.name;
      } catch {
        // Category might already exist (race condition) — try to find it
        const existing = await db.category.findFirst({
          where: {
            userId: user.id,
            name: catResult.suggestedName,
          },
        });
        if (existing) {
          categoryId = existing.id;
          categoryName = existing.name;
        }
      }
    }

    // If only one account, create the transaction immediately
    if (accounts.length === 1) {
      const account = accounts[0];
      const currency = parsed.currency || account.currency;

      try {
        const txn = await createExpenseTransaction(
          user.id,
          account.id,
          parsed.amount,
          currency,
          parsed.description,
          categoryId,
        );

        const catLabel = txn.category?.name ?? "Uncategorized";
        await ctx.reply(
          `\u2705 Expense recorded!\n\n` +
          `\u{1F4B0} ${txn.amount.toFixed(2)} ${txn.currency}\n` +
          `\u{1F4DD} ${txn.description || "Expense"}\n` +
          `\u{1F3F7}\uFE0F ${catLabel}\n` +
          `\u{1F4B3} ${account.name}`
        );
      } catch (error) {
        console.error("Failed to create expense from Telegram:", error);
        await ctx.reply("Failed to create the expense. Please try again.");
      }
      return;
    }

    // Multiple accounts — store pending and show inline keyboard
    pendingExpenses.set(chatId, {
      userId: user.id,
      amount: parsed.amount,
      currency: parsed.currency,
      description: parsed.description,
      categoryId,
      categoryName,
      createdAt: Date.now(),
    });

    const keyboard = new InlineKeyboard();
    for (const account of accounts) {
      keyboard.text(
        `${account.name} (${account.currency})`,
        `account:${account.id}`,
      ).row();
    }
    keyboard.text("\u274C Cancel", "cancel_expense");

    const catLabel = categoryName ?? "Uncategorized";
    await ctx.reply(
      `\u{1F4B8} New expense:\n` +
      `\u{1F4B0} ${parsed.amount.toFixed(2)}${parsed.currency ? ` ${parsed.currency}` : ""}\n` +
      `\u{1F4DD} ${parsed.description}\n` +
      `\u{1F3F7}\uFE0F ${catLabel}\n\n` +
      "Which account should I charge?",
      { reply_markup: keyboard },
    );
  });
}
