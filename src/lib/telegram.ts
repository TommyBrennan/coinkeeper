import { Bot, Context, InlineKeyboard, webhookCallback } from "grammy";
import { db } from "./db";
import { categorizeTransaction } from "./categorize";
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

    if (pendingExpenses.has(chatId)) {
      pendingExpenses.delete(chatId);
      await ctx.reply("Expense entry cancelled.");
    } else {
      await ctx.reply("Nothing to cancel.");
    }
  });

  // /help command
  bot.command("help", async (ctx) => {
    const linked = await requireLinkedUser(ctx);
    if (!linked) return;

    await ctx.reply(
      "\u{1F4CB} Available commands:\n\n" +
      "/balance \u2014 View account balances\n" +
      "/spending \u2014 Monthly spending summary\n" +
      "/cancel \u2014 Cancel pending expense entry\n" +
      "/help \u2014 Show this help message\n" +
      "/unlink \u2014 Unlink your Telegram account\n\n" +
      "\u{1F4B8} Quick expense entry:\n" +
      "Just send a message with an amount!\n" +
      'Examples: "Coffee 5.50", "25 EUR Lunch", "Groceries 42.99"'
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

    // Handle cancel button
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
