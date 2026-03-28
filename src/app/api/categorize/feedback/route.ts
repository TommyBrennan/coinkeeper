import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { parseJsonBody } from "@/lib/api-utils";

// POST /api/categorize/feedback — store user correction of AI suggestion
export async function POST(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: body, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const { description, suggestedCategoryId, correctedCategoryId } = body;

  if (!description || typeof description !== "string" || !description.trim()) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 }
    );
  }

  if (!correctedCategoryId || typeof correctedCategoryId !== "string") {
    return NextResponse.json(
      { error: "correctedCategoryId is required" },
      { status: 400 }
    );
  }

  // Don't store if user chose the same category AI suggested
  if (suggestedCategoryId === correctedCategoryId) {
    return NextResponse.json({ stored: false, reason: "no correction needed" });
  }

  const correction = await db.categoryCorrection.create({
    data: {
      userId: user.id,
      description: description.trim(),
      suggestedCategoryId: suggestedCategoryId || null,
      correctedCategoryId,
    },
  });

  return NextResponse.json({ stored: true, id: correction.id });
}
