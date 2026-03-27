import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { calculateNextRunAt } from "@/lib/report-schedule";

// GET /api/reports/[id] — get a single saved report
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const report = await db.savedReport.findFirst({
    where: { id, userId: user.id },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...report,
    filters: JSON.parse(report.filters),
  });
}

// PATCH /api/reports/[id] — update a saved report
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.savedReport.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }
    data.name = body.name.trim();
  }

  if (body.description !== undefined) {
    data.description = body.description?.trim() || null;
  }

  if (body.format !== undefined) {
    const validFormats = ["csv", "json", "pdf"];
    if (!validFormats.includes(body.format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be csv, json, or pdf" },
        { status: 400 }
      );
    }
    data.format = body.format;
  }

  if (body.filters !== undefined) {
    if (typeof body.filters !== "object") {
      return NextResponse.json(
        { error: "Filters must be an object" },
        { status: 400 }
      );
    }
    data.filters = JSON.stringify(body.filters);
  }

  // Handle schedule fields
  if (body.scheduleEnabled !== undefined) {
    data.scheduleEnabled = !!body.scheduleEnabled;
    if (body.scheduleEnabled) {
      if (body.scheduleFrequency !== undefined) data.scheduleFrequency = body.scheduleFrequency;
      if (body.scheduleDay !== undefined) data.scheduleDay = body.scheduleDay;
      if (body.scheduleTime !== undefined) data.scheduleTime = body.scheduleTime;
      // Recalculate nextRunAt
      const freq = body.scheduleFrequency ?? existing.scheduleFrequency ?? "daily";
      const day = body.scheduleDay ?? existing.scheduleDay;
      data.nextRunAt = calculateNextRunAt(freq, day);
    } else {
      // Disable: clear schedule fields
      data.scheduleFrequency = null;
      data.scheduleDay = null;
      data.scheduleTime = null;
      data.nextRunAt = null;
    }
  } else if (body.scheduleFrequency !== undefined || body.scheduleDay !== undefined) {
    // Update schedule params without toggling enabled/disabled
    if (body.scheduleFrequency !== undefined) data.scheduleFrequency = body.scheduleFrequency;
    if (body.scheduleDay !== undefined) data.scheduleDay = body.scheduleDay;
    if (body.scheduleTime !== undefined) data.scheduleTime = body.scheduleTime;
    if (existing.scheduleEnabled) {
      const freq = (body.scheduleFrequency ?? existing.scheduleFrequency) as string;
      const day = body.scheduleDay ?? existing.scheduleDay;
      data.nextRunAt = calculateNextRunAt(freq, day);
    }
  }

  const updated = await db.savedReport.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    ...updated,
    filters: JSON.parse(updated.filters),
  });
}

// DELETE /api/reports/[id] — delete a saved report
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.savedReport.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  await db.savedReport.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
