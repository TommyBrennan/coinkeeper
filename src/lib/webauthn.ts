/**
 * WebAuthn configuration.
 * RP = Relying Party (this application).
 */

export function getWebAuthnConfig() {
  const rpName = "CoinKeeper";
  // In production, use the actual domain. For dev, use localhost.
  const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
  const origin = process.env.WEBAUTHN_ORIGIN || `http://${rpID}:3000`;

  return { rpName, rpID, origin };
}
