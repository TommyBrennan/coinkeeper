import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

// GET /api/reports/[id]/generated/[genId] — download a generated report file
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; genId: string }> }
) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, genId } = await params;

  const generated = await db.generatedReport.findFirst({
    where: { id: genId, reportId: id, userId: user.id },
  });

  if (!generated) {
    return NextResponse.json(
      { error: "Generated report not found" },
      { status: 404 }
    );
  }

  const contentTypes: Record<string, string> = {
    csv: "text/csv; charset=utf-8",
    json: "application/json; charset=utf-8",
    pdf: "application/pdf",
  };

  const contentType = contentTypes[generated.format] || "application/octet-stream";
  const fileName = generated.fileName || `report.${generated.format}`;

  return new Response(new Uint8Array(generated.data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

// DELETE /api/reports/[id]/generated/[genId] — delete a generated report
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; genId: string }> }
) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, genId } = await params;

  const generated = await db.generatedReport.findFirst({
    where: { id: genId, reportId: id, userId: user.id },
  });

  if (!generated) {
    return NextResponse.json(
      { error: "Generated report not found" },
      { status: 404 }
    );
  }

  await db.generatedReport.delete({ where: { id: genId } });

  return NextResponse.json({ success: true });
}
