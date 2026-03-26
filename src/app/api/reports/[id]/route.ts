import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

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
    const validFormats = ["csv", "json"];
    if (!validFormats.includes(body.format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be csv or json" },
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
