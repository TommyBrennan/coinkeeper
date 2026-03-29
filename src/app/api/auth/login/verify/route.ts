import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { getWebAuthnConfig } from "@/lib/webauthn";
import { logAuditEvent } from "@/lib/audit";
import crypto from "crypto";

const PENDING_2FA_COOKIE = "ck_pending_2fa";
const PENDING_2FA_MAX_AGE = 5 * 60; // 5 minutes in seconds

/**
 * POST /api/auth/login/verify
 * Verify WebAuthn authentication response.
 * If user has TOTP enabled, issue a pending-2fa token instead of full session.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Retrieve challenge and user ID from cookies
    const challenge = req.cookies.get("ck_auth_challenge")?.value;
    const userId = req.cookies.get("ck_auth_user")?.value;

    if (!challenge || !userId) {
      return NextResponse.json(
        { error: "Login session expired. Please try again." },
        { status: 400 }
      );
    }

    // Find the credential that was used
    const credentialId = body.id;
    const credential = await db.credential.findFirst({
      where: {
        userId,
        credentialId,
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 400 }
      );
    }

    const { rpID, origin } = getWebAuthnConfig();

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credentialId,
        publicKey: credential.publicKey,
        counter: Number(credential.counter),
        transports: credential.transports
          ? (() => { try { return JSON.parse(credential.transports); } catch { return undefined; } })()
          : undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Authentication verification failed" },
        { status: 400 }
      );
    }

    // Update credential counter to prevent replay attacks
    await db.credential.update({
      where: { id: credential.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });

    // Check if user has TOTP 2FA enabled
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true },
    });

    const response = (() => {
      if (user?.totpEnabled) {
        // Issue a pending-2fa token instead of full session
        const pending2faToken = crypto.randomBytes(32).toString("hex");

        // Store the pending token temporarily — we use a signed cookie with userId
        const tokenPayload = JSON.stringify({
          userId,
          token: pending2faToken,
          expiresAt: Date.now() + PENDING_2FA_MAX_AGE * 1000,
        });

        const res = NextResponse.json({ success: true, requires2fa: true });
        res.cookies.set(PENDING_2FA_COOKIE, Buffer.from(tokenPayload).toString("base64"), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: PENDING_2FA_MAX_AGE,
        });
        return res;
      } else {
        // No TOTP — create full session immediately
        // Note: createSession uses next/headers cookies(), but we're in a route handler
        // so we need to handle this differently
        return null; // handled below
      }
    })();

    if (response) {
      // Clear auth cookies on the pending-2fa response
      response.cookies.delete("ck_auth_challenge");
      response.cookies.delete("ck_auth_user");
      return response;
    }

    // No 2FA — create full session
    await createSession(userId);

    // Audit: login success
    logAuditEvent("login", userId, null, req);

    // Clear auth cookies
    const successResponse = NextResponse.json({ success: true });
    successResponse.cookies.delete("ck_auth_challenge");
    successResponse.cookies.delete("ck_auth_user");

    return successResponse;
  } catch (error) {
    console.error("Login verify error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
