import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push-notifications";

/**
 * GET /api/push/vapid-key — return the VAPID public key for client-side push registration
 */
export async function GET() {
  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return NextResponse.json(
      { error: "Push notifications not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey });
}
