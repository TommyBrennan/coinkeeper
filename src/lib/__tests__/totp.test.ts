/**
 * Unit tests for TOTP utility functions.
 */
import { describe, it, expect } from "vitest";
import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotpToken,
  generateTotpToken,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from "../totp";

describe("generateTotpSecret", () => {
  it("should generate a non-empty secret", () => {
    const secret = generateTotpSecret();
    expect(secret).toBeTruthy();
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it("should generate unique secrets", () => {
    const s1 = generateTotpSecret();
    const s2 = generateTotpSecret();
    expect(s1).not.toBe(s2);
  });
});

describe("generateTotpUri", () => {
  it("should generate a valid otpauth URI", () => {
    const uri = generateTotpUri("JBSWY3DPEHPK3PXP", "test@example.com");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("CoinKeeper");
    expect(uri).toContain("test%40example.com");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
  });
});

describe("verifyTotpToken", () => {
  it("should verify a valid token", () => {
    const secret = generateTotpSecret();
    const token = generateTotpToken(secret);
    expect(verifyTotpToken(token, secret)).toBe(true);
  });

  it("should reject an invalid token", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpToken("000000", secret)).toBe(false);
  });

  it("should reject empty token", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpToken("", secret)).toBe(false);
  });

  it("should reject empty secret", () => {
    expect(verifyTotpToken("123456", "")).toBe(false);
  });
});

describe("generateBackupCodes", () => {
  it("should generate 8 codes by default", () => {
    const { plain, hashed } = generateBackupCodes();
    expect(plain).toHaveLength(8);
    expect(hashed).toHaveLength(8);
  });

  it("should generate specified number of codes", () => {
    const { plain, hashed } = generateBackupCodes(4);
    expect(plain).toHaveLength(4);
    expect(hashed).toHaveLength(4);
  });

  it("should format codes as XXXX-XXXX", () => {
    const { plain } = generateBackupCodes();
    for (const code of plain) {
      expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
    }
  });

  it("should produce unique codes", () => {
    const { plain } = generateBackupCodes();
    const unique = new Set(plain);
    expect(unique.size).toBe(plain.length);
  });

  it("should produce different hashes than plain codes", () => {
    const { plain, hashed } = generateBackupCodes();
    for (let i = 0; i < plain.length; i++) {
      expect(hashed[i]).not.toBe(plain[i]);
    }
  });
});

describe("hashBackupCode", () => {
  it("should produce consistent hashes", () => {
    const h1 = hashBackupCode("ABCD-1234");
    const h2 = hashBackupCode("ABCD-1234");
    expect(h1).toBe(h2);
  });

  it("should produce different hashes for different codes", () => {
    const h1 = hashBackupCode("ABCD-1234");
    const h2 = hashBackupCode("EFGH-5678");
    expect(h1).not.toBe(h2);
  });

  it("should be case-insensitive", () => {
    const h1 = hashBackupCode("abcd-1234");
    const h2 = hashBackupCode("ABCD-1234");
    expect(h1).toBe(h2);
  });
});

describe("verifyBackupCode", () => {
  it("should find matching backup code", () => {
    const { plain, hashed } = generateBackupCodes(4);
    const index = verifyBackupCode(plain[2], hashed);
    expect(index).toBe(2);
  });

  it("should return -1 for non-matching code", () => {
    const { hashed } = generateBackupCodes(4);
    const index = verifyBackupCode("ZZZZ-9999", hashed);
    expect(index).toBe(-1);
  });
});
