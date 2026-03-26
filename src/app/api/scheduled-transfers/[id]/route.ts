import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { calculateNextExecution } from "@/lib/schedule";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/scheduled-transfers/[id] ──────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await requireUser();
  const { id } = await context.params;

  const schedule = await db.scheduledTransfer.findFirst({
    where: { id, userId: user.id },
    include: {
      fromAccount: {
        select: { id: true, name: true, currency: true, color: true, balance: true },
      },
      toAccount: {
        select: { id: true, name: true, currency: true, color: true, balance: true },
      },
    },
  });

  if (!schedule) {
    return NextResponse.json(
      { error: "Scheduled transfer not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(schedule);
}

// ─── PATCH /api/scheduled-transfers/[id] ────────────────────────────

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await requireUser();
  const { id } = await context.params;
  const body = await request.json();

  // Verify ownership
  const existing = await db.scheduledTransfer.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Scheduled transfer not found" },
      { status: 404 }
    );
  }

  const updates: Record<string, unknown> = {};

  // Account updates
  if (body.fromAccountId) {
    const acc = await db.account.findFirst({
      where: { id: body.fromAccountId, userId: user.id },
    });
    if (!acc) {
      return NextResponse.json(
        { error: "Source account not found" },
        { status: 404 }
      );
    }
    updates.fromAccountId = body.fromAccountId;
    updates.currency = acc.currency;
  }

  if (body.toAccountId) {
    const acc = await db.account.findFirst({
      where: { id: body.toAccountId, userId: user.id },
    });
    if (!acc) {
      return NextResponse.json(
        { error: "Destination account not found" },
        { status: 404 }
      );
    }
    updates.toAccountId = body.toAccountId;
  }

  // Ensure from != to after updates
  const effectiveFrom = (updates.fromAccountId as string) || existing.fromAccountId;
  const effectiveTo = (updates.toAccountId as string) || existing.toAccountId;
  if (effectiveFrom === effectiveTo) {
    return NextResponse.json(
      { error: "Source and destination accounts must be different" },
      { status: 400 }
    );
  }

  // Simple field updates
  if (typeof body.amount === "number" && body.amount > 0) {
    updates.amount = body.amount;
  }

  if (body.description !== undefined) {
    updates.description = body.description?.trim() || null;
  }

  if (typeof body.isActive === "boolean") {
    updates.isActive = body.isActive;
  }

  // Rate mode updates
  if (body.rateMode) {
    const validModes = ["auto", "manual", "final"];
    if (!validModes.includes(body.rateMode)) {
      return NextResponse.json(
        { error: `Rate mode must be one of: ${validModes.join(", ")}` },
        { status: 400 }
      );
    }
    updates.rateMode = body.rateMode;
    // Reset rate fields when mode changes
    updates.manualRate = body.rateMode === "manual" ? (body.manualRate ?? null) : null;
    updates.finalAmount = body.rateMode === "final" ? (body.finalAmount ?? null) : null;
  }

  if (body.endDate !== undefined) {
    updates.endDate = body.endDate ? new Date(body.endDate) : null;
  }

  // Schedule updates — recalculate nextExecution
  const scheduleChanged =
    body.frequency !== undefined ||
    body.interval !== undefined ||
    body.dayOfWeek !== undefined ||
    body.dayOfMonth !== undefined;

  if (scheduleChanged) {
    const freq = body.frequency || existing.frequency;
    const intv = Math.max(1, parseInt(body.interval, 10) || existing.interval);
    const dow =
      body.dayOfWeek !== undefined
        ? typeof body.dayOfWeek === "number" ? body.dayOfWeek : null
        : existing.dayOfWeek;
    const dom =
      body.dayOfMonth !== undefined
        ? typeof body.dayOfMonth === "number" ? body.dayOfMonth : null
        : existing.dayOfMonth;

    updates.frequency = freq;
    updates.interval = intv;
    updates.dayOfWeek = dow;
    updates.dayOfMonth = dom;
    updates.nextExecution = calculateNextExecution(freq, intv, dow, dom);
  }

  const updated = await db.scheduledTransfer.update({
    where: { id },
    data: updates,
    include: {
      fromAccount: {
        select: { id: true, name: true, currency: true, color: true },
      },
      toAccount: {
        select: { id: true, name: true, currency: true, color: true },
      },
    },
  });

  return NextResponse.json(updated);
}

// ─── DELETE /api/scheduled-transfers/[id] ───────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await requireUser();
  const { id } = await context.params;

  const existing = await db.scheduledTransfer.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Scheduled transfer not found" },
      { status: 404 }
    );
  }

  await db.scheduledTransfer.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
