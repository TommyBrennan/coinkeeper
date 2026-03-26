import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { getWebAuthnConfig } from "@/lib/webauthn";

/**
 * POST /api/auth/register/verify
 * Verify WebAuthn registration response and create user + credential + session.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Retrieve challenge and user info from cookies
    const challenge = req.cookies.get("ck_reg_challenge")?.value;
    const userDataStr = req.cookies.get("ck_reg_user")?.value;

    if (!challenge || !userDataStr) {
      return NextResponse.json(
        { error: "Registration session expired. Please try again." },
        { status: 400 }
      );
    }

    const userData = JSON.parse(userDataStr);
    const { rpID, origin } = getWebAuthnConfig();

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Registration verification failed" },
        { status: 400 }
      );
    }

    const { credential } = verification.registrationInfo;

    // Create user and credential in a transaction
    const user = await db.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        credentials: {
          create: {
            credentialId: Buffer.from(credential.id).toString("base64url"),
            publicKey: Buffer.from(credential.publicKey),
            counter: BigInt(credential.counter),
            transports: body.response?.transports
              ? JSON.stringify(body.response.transports)
              : null,
          },
        },
      },
    });

    // Create session
    await createSession(user.id);

    // Clear registration cookies
    const response = NextResponse.json({ success: true, userId: user.id });
    response.cookies.delete("ck_reg_challenge");
    response.cookies.delete("ck_reg_user");

    return response;
  } catch (error) {
    console.error("Registration verify error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
