import { NextResponse } from "next/server";
import { getWebhookHandler } from "@/lib/telegram";

export async function POST(req: Request) {
  const handler = getWebhookHandler();
  if (!handler) {
    return NextResponse.json(
      { error: "Telegram bot not configured" },
      { status: 503 }
    );
  }

  try {
    return await handler(req);
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram to prevent retries
  }
}
