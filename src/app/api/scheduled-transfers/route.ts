import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { calculateNextExecution } from "@/lib/schedule";

// ─── GET /api/scheduled-transfers ───────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
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
  const user = await getCurrentUser();
  const body = await request.json();

  const {
    fromAccountId,
    toAccountId,
    amount,
    rateMode,
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

  // Validate required fields
  if (!fromAccountId || !toAccountId) {
    return NextResponse.json(
      { error: "Both source and destination accounts are required" },
      { status: 400 }
    );
  }

  if (fromAccountId === toAccountId) {
    return NextResponse.json(
      { error: "Source and destination accounts must be different" },
      { status: 400 }
    );
  }

  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 }
    );
  }

  const validFrequencies = ["daily", "weekly", "monthly"];
  if (!frequency || !validFrequencies.includes(frequency)) {
    return NextResponse.json(
      { error: `Frequency must be one of: ${validFrequencies.join(", ")}` },
      { status: 400 }
    );
  }

  const validRateModes = ["auto", "manual", "final"];
  const effectiveRateMode = rateMode || "auto";
  if (!validRateModes.includes(effectiveRateMode)) {
    return NextResponse.json(
      { error: `Rate mode must be one of: ${validRateModes.join(", ")}` },
      { status: 400 }
    );
  }

  if (effectiveRateMode === "manual" && (typeof manualRate !== "number" || manualRate <= 0)) {
    return NextResponse.json(
      { error: "Manual rate must be a positive number" },
      { status: 400 }
    );
  }

  if (effectiveRateMode === "final" && (typeof finalAmount !== "number" || finalAmount <= 0)) {
    return NextResponse.json(
      { error: "Final amount must be a positive number" },
      { status: 400 }
    );
  }

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

  const interval = Math.max(1, parseInt(rawInterval, 10) || 1);
  const parsedDayOfWeek =
    typeof dayOfWeek === "number" && dayOfWeek >= 0 && dayOfWeek <= 6
      ? dayOfWeek
      : null;
  const parsedDayOfMonth =
    typeof dayOfMonth === "number" && dayOfMonth >= 1 && dayOfMonth <= 31
      ? dayOfMonth
      : null;

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
