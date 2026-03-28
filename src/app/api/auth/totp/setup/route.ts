import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateTotpSecret,
  generateTotpUri,
  generateQrCodeDataUrl,
} from "@/lib/totp";

/**
 * POST /api/auth/totp/setup
 * Generate a TOTP secret and QR code for the user.
 * Does NOT enable TOTP yet — user must verify with /api/auth/totp/enable.
 */
export async function POST() {
  try {
    const { user, error } = await requireApiUser();
    if (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already enabled
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { totpEnabled: true },
    });

    if (currentUser?.totpEnabled) {
      return NextResponse.json(
        { error: "TOTP 2FA is already enabled. Disable it first to reconfigure." },
        { status: 400 }
      );
    }

    // Generate secret
    const secret = generateTotpSecret();
    const uri = generateTotpUri(secret, user.email);
    const qrCodeDataUrl = await generateQrCodeDataUrl(uri);

    // Store the secret (not yet enabled)
    await db.user.update({
      where: { id: user.id },
      data: { totpSecret: secret, totpEnabled: false },
    });

    return NextResponse.json({
      secret,
      qrCodeDataUrl,
      uri,
    });
  } catch (err) {
    console.error("TOTP setup error:", err);
    return NextResponse.json(
      { error: "Failed to set up TOTP" },
      { status: 500 }
    );
  }
}
