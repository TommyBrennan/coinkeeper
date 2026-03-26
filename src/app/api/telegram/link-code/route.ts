import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { generateLinkCode, getTelegramLinkStatus } from "@/lib/telegram";

export async function POST() {
  const { user, error } = await requireApiUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if already linked
  const existingLink = await getTelegramLinkStatus(user.id);
  if (existingLink) {
    return NextResponse.json(
      { error: "Telegram is already linked. Unlink first to generate a new code." },
      { status: 400 }
    );
  }

  const code = await generateLinkCode(user.id);
  return NextResponse.json({
    code,
    expiresIn: 600, // 10 minutes in seconds
    instructions: "Send /link " + code + " to the CoinKeeper bot on Telegram",
  });
}
