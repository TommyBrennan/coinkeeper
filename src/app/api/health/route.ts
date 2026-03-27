import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const status: {
    status: "ok" | "degraded" | "error";
    timestamp: string;
    version: string;
    checks: Record<string, { status: string; latencyMs?: number; error?: string }>;
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    checks: {},
  };

  // Check database connectivity
  const dbStart = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    status.checks.database = {
      status: "ok",
      latencyMs: Date.now() - dbStart,
    };
  } catch (err) {
    status.checks.database = {
      status: "error",
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : "Unknown database error",
    };
    status.status = "error";
  }

  // Check if migrations are up to date (table existence check)
  try {
    await db.user.count();
    status.checks.migrations = { status: "ok" };
  } catch {
    status.checks.migrations = {
      status: "error",
      error: "Core tables missing — migrations may not have run",
    };
    status.status = "error";
  }

  const httpStatus = status.status === "ok" ? 200 : 503;
  return NextResponse.json(status, { status: httpStatus });
}
