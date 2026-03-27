import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { calculateNextRunAt } from "@/lib/report-schedule";
import { parseAndValidateBody } from "@/lib/api-utils";
import { updateReportSchema } from "@/lib/validations";

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

  let filters = {};
  try { filters = JSON.parse(report.filters); } catch { /* invalid JSON, default to empty */ }

  return NextResponse.json({
    ...report,
    filters,
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

  const { data: body, error: parseError } = await parseAndValidateBody(request, updateReportSchema);
  if (parseError) return parseError;
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    data.name = body.name.trim();
  }

  if (body.description !== undefined) {
    data.description = body.description?.trim() || null;
  }

  if (body.format !== undefined) {
    data.format = body.format;
  }

  if (body.filters !== undefined) {
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

  let updatedFilters = {};
  try { updatedFilters = JSON.parse(updated.filters); } catch { /* invalid JSON, default to empty */ }

  return NextResponse.json({
    ...updated,
    filters: updatedFilters,
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
