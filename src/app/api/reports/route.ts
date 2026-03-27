import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { calculateNextRunAt } from "@/lib/report-schedule";
import { parseAndValidateBody } from "@/lib/api-utils";
import { createReportSchema } from "@/lib/validations";

// GET /api/reports — list user's saved reports
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await db.savedReport.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { generatedReports: true },
      },
    },
  });

  return NextResponse.json(
    reports.map((r) => {
      let filters = {};
      try { filters = JSON.parse(r.filters); } catch { /* invalid JSON, default to empty */ }
      return {
        ...r,
        filters,
        generatedCount: r._count.generatedReports,
        _count: undefined,
      };
    })
  );
}

// POST /api/reports — create a new saved report
export async function POST(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: parseError } = await parseAndValidateBody(request, createReportSchema);
  if (parseError) return parseError;
  const { name, description, filters, scheduleEnabled, scheduleFrequency, scheduleDay, scheduleTime } = body;

  const reportFormat = body.format;

  // Calculate nextRunAt if schedule is enabled
  let nextRunAt: Date | null = null;
  if (scheduleEnabled && scheduleFrequency) {
    nextRunAt = calculateNextRunAt(scheduleFrequency, scheduleDay ?? null);
  }

  const report = await db.savedReport.create({
    data: {
      userId: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      format: reportFormat,
      filters: JSON.stringify(filters),
      scheduleEnabled: !!scheduleEnabled,
      scheduleFrequency: scheduleEnabled ? scheduleFrequency || null : null,
      scheduleDay: scheduleEnabled ? (scheduleDay ?? null) : null,
      scheduleTime: scheduleEnabled ? (scheduleTime || null) : null,
      nextRunAt,
    },
  });

  return NextResponse.json(
    { ...report, filters: (() => { try { return JSON.parse(report.filters); } catch { return {}; } })() },
    { status: 201 }
  );
}
