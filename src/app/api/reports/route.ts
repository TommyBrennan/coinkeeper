import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { calculateNextRunAt } from "@/lib/report-schedule";
import { parseJsonBody } from "@/lib/api-utils";

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
    reports.map((r) => ({
      ...r,
      filters: JSON.parse(r.filters),
      generatedCount: r._count.generatedReports,
      _count: undefined,
    }))
  );
}

// POST /api/reports — create a new saved report
export async function POST(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;
  const { name, description, format, filters, scheduleEnabled, scheduleFrequency, scheduleDay, scheduleTime } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  if (!filters || typeof filters !== "object") {
    return NextResponse.json(
      { error: "Filters object is required" },
      { status: 400 }
    );
  }

  const validFormats = ["csv", "json", "pdf"];
  const reportFormat = validFormats.includes(format) ? format : "csv";

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
    { ...report, filters: JSON.parse(report.filters) },
    { status: 201 }
  );
}
