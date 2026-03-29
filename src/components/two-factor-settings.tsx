"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

type Step =
  | "loading"
  | "disabled"
  | "setup"
  | "enabled"
  | "confirm-disable"
  | "confirm-regen"
  | "show-backup-codes";

interface TotpStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}

export function TwoFactorSettings() {
  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);

  // Setup step state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");

  // Backup codes display
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Disable/regen confirmation
  const [confirmCode, setConfirmCode] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/totp/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data: TotpStatus = await res.json();
      setBackupCodesRemaining(data.backupCodesRemaining);
      setStep(data.enabled ? "enabled" : "disabled");
    } catch {
      setStep("disabled");
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSetup = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/totp/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed");
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
      setVerifyCode("");
      setStep("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!verifyCode.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/totp/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setBackupCodes(data.backupCodes);
      setBackupCodesRemaining(data.backupCodes.length);
      setStep("show-backup-codes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirmCode.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: confirmCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disable");
      setConfirmCode("");
      setStep("disabled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!confirmCode.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/totp/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: confirmCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to regenerate");
      setBackupCodes(data.backupCodes);
      setBackupCodesRemaining(data.backupCodes.length);
      setConfirmCode("");
      setStep("show-backup-codes");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to regenerate codes"
      );
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = backupCodes.join("\n");
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (step === "loading") {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Loading 2FA settings...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center gap-2 mb-1">
        <svg
          className="w-5 h-5 text-gray-700 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Two-Factor Authentication
        </h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Add an extra layer of security with a time-based one-time password
        (TOTP).
      </p>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* DISABLED STATE — show enable button */}
      {step === "disabled" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              Disabled
            </span>
          </div>
          <button
            onClick={handleSetup}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Enable 2FA
              </>
            )}
          </button>
        </div>
      )}

      {/* SETUP STATE — show QR code and verification input */}
      {step === "setup" && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Scan this QR code with your authenticator app (Google
              Authenticator, Authy, etc.):
            </p>
            {qrCodeDataUrl && (
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-lg inline-block">
                  <Image
                    src={qrCodeDataUrl}
                    alt="TOTP QR Code"
                    width={200}
                    height={200}
                    unoptimized
                  />
                </div>
              </div>
            )}
            {secret && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Or enter this code manually:
                </p>
                <code className="block bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 dark:text-gray-100 select-all break-all">
                  {secret}
                </code>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label
              htmlFor="totp-verify-code"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Enter the 6-digit code from your authenticator app:
            </label>
            <div className="flex items-center gap-3">
              <input
                id="totp-verify-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={verifyCode}
                onChange={(e) =>
                  setVerifyCode(e.target.value.replace(/\D/g, ""))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEnable();
                }}
                placeholder="000000"
                autoFocus
                className="w-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-center text-lg font-mono tracking-widest text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                onClick={handleEnable}
                disabled={loading || verifyCode.length !== 6}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Verify & Enable"
                )}
              </button>
              <button
                onClick={() => {
                  setStep("disabled");
                  setError(null);
                }}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOW BACKUP CODES — after enable or regenerate */}
      {step === "show-backup-codes" && (
        <div>
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Save your backup codes
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Store these codes in a safe place. Each code can only be used
                  once. You won&apos;t be able to see them again.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <code
                  key={i}
                  className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 rounded px-2 py-1 text-center"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copyBackupCodes}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {copied ? "Copied!" : "Copy codes"}
            </button>
            <button
              onClick={() => {
                setBackupCodes([]);
                setCopied(false);
                setStep("enabled");
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ENABLED STATE — show status and actions */}
      {step === "enabled" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              Enabled
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {backupCodesRemaining} backup{" "}
              {backupCodesRemaining === 1 ? "code" : "codes"} remaining
            </span>
          </div>

          {backupCodesRemaining <= 2 && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
              You have few backup codes left. Consider regenerating them.
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setConfirmCode("");
                setError(null);
                setStep("confirm-regen");
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Regenerate Backup Codes
            </button>
            <button
              onClick={() => {
                setConfirmCode("");
                setError(null);
                setStep("confirm-disable");
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              Disable 2FA
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DISABLE — code input */}
      {step === "confirm-disable" && (
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Enter your authenticator code to confirm disabling 2FA:
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={confirmCode}
              onChange={(e) =>
                setConfirmCode(e.target.value.replace(/\D/g, ""))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDisable();
              }}
              placeholder="000000"
              autoFocus
              aria-label="TOTP code to disable 2FA"
              className="w-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-center text-lg font-mono tracking-widest text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
            <button
              onClick={handleDisable}
              disabled={loading || confirmCode.length !== 6}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Disabling...
                </span>
              ) : (
                "Confirm Disable"
              )}
            </button>
            <button
              onClick={() => {
                setStep("enabled");
                setError(null);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM REGENERATE — code input */}
      {step === "confirm-regen" && (
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Enter your authenticator code to regenerate backup codes. Previous
            codes will become invalid.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={confirmCode}
              onChange={(e) =>
                setConfirmCode(e.target.value.replace(/\D/g, ""))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRegenerateBackupCodes();
              }}
              placeholder="000000"
              autoFocus
              aria-label="TOTP code to regenerate backup codes"
              className="w-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-center text-lg font-mono tracking-widest text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              onClick={handleRegenerateBackupCodes}
              disabled={loading || confirmCode.length !== 6}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Regenerating...
                </span>
              ) : (
                "Regenerate"
              )}
            </button>
            <button
              onClick={() => {
                setStep("enabled");
                setError(null);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
