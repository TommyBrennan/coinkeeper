import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// GET /api/reports — list user's saved reports
export async function GET() {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await db.savedReport.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    reports.map((r) => ({
      ...r,
      filters: JSON.parse(r.filters),
    }))
  );
}

// POST /api/reports — create a new saved report
export async function POST(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, format, filters } = body;

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

  const report = await db.savedReport.create({
    data: {
      userId: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      format: reportFormat,
      filters: JSON.stringify(filters),
    },
  });

  return NextResponse.json(
    { ...report, filters: JSON.parse(report.filters) },
    { status: 201 }
  );
}
