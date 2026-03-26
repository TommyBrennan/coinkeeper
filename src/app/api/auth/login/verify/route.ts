import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { getWebAuthnConfig } from "@/lib/webauthn";

/**
 * POST /api/auth/login/verify
 * Verify WebAuthn authentication response and create a session.
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
          ? JSON.parse(credential.transports)
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

    // Create session
    await createSession(userId);

    // Clear auth cookies
    const response = NextResponse.json({ success: true });
    response.cookies.delete("ck_auth_challenge");
    response.cookies.delete("ck_auth_user");

    return response;
  } catch (error) {
    console.error("Login verify error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
