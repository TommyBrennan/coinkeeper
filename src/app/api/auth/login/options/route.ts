import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { getWebAuthnConfig } from "@/lib/webauthn";
import { parseAndValidateBody } from "@/lib/api-utils";
import { loginOptionsSchema } from "@/lib/validations";

/**
 * POST /api/auth/login/options
 * Generate WebAuthn authentication options (challenge) for an existing user.
 * Body: { email: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { data: body, error: parseError } = await parseAndValidateBody(req, loginOptionsSchema);
    if (parseError) return parseError;
    const { email } = body;

    // Find user and their credentials
    const user = await db.user.findUnique({
      where: { email },
      include: { credentials: true },
    });

    if (!user || user.credentials.length === 0) {
      return NextResponse.json(
        { error: "No account found with this email. Please register first." },
        { status: 404 }
      );
    }

    const { rpID } = getWebAuthnConfig();

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.credentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports
          ? JSON.parse(cred.transports)
          : undefined,
      })),
      userVerification: "preferred",
    });

    // Store challenge and user ID in cookies
    const response = NextResponse.json(options);
    response.cookies.set("ck_auth_challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 300, // 5 minutes
    });
    response.cookies.set("ck_auth_user", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    });

    return response;
  } catch (error) {
    console.error("Login options error:", error);
    return NextResponse.json(
      { error: "Failed to generate login options" },
      { status: 500 }
    );
  }
}
