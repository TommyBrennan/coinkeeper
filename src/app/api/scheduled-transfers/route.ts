import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { calculateNextExecution } from "@/lib/schedule";
import { parseAndValidateBody } from "@/lib/api-utils";
import { createScheduledTransferSchema } from "@/lib/validations";

// ─── GET /api/scheduled-transfers ───────────────────────────────────

export async function GET(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);

  const active = searchParams.get("active"); // "true" or "false"

  const where: Record<string, unknown> = { userId: user.id };
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  const schedules = await db.scheduledTransfer.findMany({
    where,
    include: {
      fromAccount: {
        select: { id: true, name: true, currency: true, color: true },
      },
      toAccount: {
        select: { id: true, name: true, currency: true, color: true },
      },
    },
    orderBy: { nextExecution: "asc" },
  });

  return NextResponse.json({ schedules, total: schedules.length });
}

// ─── POST /api/scheduled-transfers ──────────────────────────────────

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireApiUser();
  if (authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: body, error: parseError } = await parseAndValidateBody(request, createScheduledTransferSchema);
  if (parseError) return parseError;

  const {
    fromAccountId,
    toAccountId,
    amount,
    rateMode: effectiveRateMode,
    manualRate,
    finalAmount,
    description,
    frequency,
    interval: rawInterval,
    dayOfWeek,
    dayOfMonth,
    startDate,
    endDate,
  } = body;

  // Validate account ownership
  const fromAccount = await db.account.findFirst({
    where: { id: fromAccountId, userId: user.id },
  });
  if (!fromAccount) {
    return NextResponse.json(
      { error: "Source account not found" },
      { status: 404 }
    );
  }

  const toAccount = await db.account.findFirst({
    where: { id: toAccountId, userId: user.id },
  });
  if (!toAccount) {
    return NextResponse.json(
      { error: "Destination account not found" },
      { status: 404 }
    );
  }

  const interval = rawInterval;
  const parsedDayOfWeek = dayOfWeek ?? null;
  const parsedDayOfMonth = dayOfMonth ?? null;

  // Calculate first execution
  const baseDate = startDate ? new Date(startDate) : new Date();
  const nextExecution = calculateNextExecution(
    frequency,
    interval,
    parsedDayOfWeek,
    parsedDayOfMonth,
    baseDate
  );

  // If startDate is in the future and computed next is before startDate, use startDate
  if (startDate && nextExecution < new Date(startDate)) {
    nextExecution.setTime(new Date(startDate).getTime());
  }

  const schedule = await db.scheduledTransfer.create({
    data: {
      userId: user.id,
      fromAccountId,
      toAccountId,
      amount,
      currency: fromAccount.currency,
      rateMode: effectiveRateMode,
      manualRate: effectiveRateMode === "manual" ? manualRate : null,
      finalAmount: effectiveRateMode === "final" ? finalAmount : null,
      description: description?.trim() || null,
      frequency,
      interval,
      dayOfWeek: parsedDayOfWeek,
      dayOfMonth: parsedDayOfMonth,
      nextExecution,
      endDate: endDate ? new Date(endDate) : null,
    },
    include: {
      fromAccount: {
        select: { id: true, name: true, currency: true, color: true },
      },
      toAccount: {
        select: { id: true, name: true, currency: true, color: true },
      },
    },
  });

  return NextResponse.json(schedule, { status: 201 });
}
