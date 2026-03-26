import { Bot, Context, webhookCallback } from "grammy";
import { db } from "./db";
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
        "Welcome to CoinKeeper! 💰\n\n" +
        "To get started, link your account:\n" +
        "1️⃣ Open CoinKeeper web app\n" +
        "2️⃣ Go to Settings → Telegram\n" +
        "3️⃣ Generate a link code\n" +
        "4️⃣ Send /link <code> here\n\n" +
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
      `Account linked successfully! Welcome, ${linkCode.user.name}. 🎉\n\n` +
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

  // /help command
  bot.command("help", async (ctx) => {
    const linked = await requireLinkedUser(ctx);
    if (!linked) return;

    await ctx.reply(
      "📋 Available commands:\n\n" +
      "/balance — View account balances\n" +
      "/spending — Monthly spending summary\n" +
      "/help — Show this help message\n" +
      "/unlink — Unlink your Telegram account\n\n" +
      "More features coming soon!"
    );
  });

  // Catch-all for unlinked users
  bot.on("message", async (ctx) => {
    const chatId = ctx.chat?.id?.toString();
    if (!chatId) return;

    const user = await getUserByChatId(chatId);
    if (!user) {
      await ctx.reply(
        "Please link your account first. Send /start for instructions."
      );
    }
    // If linked, future handlers (expense entry, receipt photos) will handle this
  });
}
