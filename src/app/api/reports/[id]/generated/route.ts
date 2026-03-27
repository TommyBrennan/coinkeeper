import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// GET /api/reports/[id]/generated — list generated report files
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const report = await db.savedReport.findFirst({
    where: { id, userId: user.id },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const generated = await db.generatedReport.findMany({
    where: { reportId: id, userId: user.id },
    orderBy: { generatedAt: "desc" },
    select: {
      id: true,
      format: true,
      fileName: true,
      summary: true,
      generatedAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json(
    generated.map((g) => {
      let summary = null;
      if (g.summary) {
        try { summary = JSON.parse(g.summary); } catch { /* invalid JSON, default to null */ }
      }
      return { ...g, summary };
    })
  );
}
