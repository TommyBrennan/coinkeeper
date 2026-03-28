import {
  generateSecret,
  generateSync,
  verifySync,
  generateURI,
} from "otplib";
import crypto from "crypto";
import { toDataURL } from "qrcode";

const APP_NAME = "CoinKeeper";

/**
 * Generate a new TOTP secret.
 */
export function generateTotpSecret(): string {
  return generateSecret();
}

/**
 * Generate an otpauth:// URI for use with authenticator apps.
 */
export function generateTotpUri(secret: string, email: string): string {
  return generateURI({
    secret,
    issuer: APP_NAME,
    label: email,
  });
}

/**
 * Generate a QR code as a data URL for the given otpauth URI.
 */
export async function generateQrCodeDataUrl(uri: string): Promise<string> {
  return toDataURL(uri, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Verify a TOTP token against a secret.
 * Allows a 1-step window (30 seconds before/after).
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  const result = verifySync({ token, secret });
  return result.valid;
}

/**
 * Generate a TOTP token for a secret (used in tests).
 */
export function generateTotpToken(secret: string): string {
  return generateSync({ secret });
}

/**
 * Generate a set of backup codes.
 * Returns both the plain codes (to show user) and hashed codes (to store).
 */
export function generateBackupCodes(
  count: number = 8
): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes in xxxx-xxxx format
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    plain.push(formatted);
    hashed.push(hashBackupCode(formatted));
  }

  return { plain, hashed };
}

/**
 * Hash a backup code for secure storage.
 */
export function hashBackupCode(code: string): string {
  return crypto
    .createHash("sha256")
    .update(code.replace("-", "").toUpperCase())
    .digest("hex");
}

/**
 * Verify a backup code against the stored hashed codes.
 * Returns the index of the matched code, or -1 if no match.
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): number {
  const hashed = hashBackupCode(code);
  return hashedCodes.findIndex((h) => h === hashed);
}
