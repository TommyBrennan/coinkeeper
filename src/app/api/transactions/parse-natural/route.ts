import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { parseNaturalLanguage } from "@/lib/parse-natural";
import { categorizeTransaction } from "@/lib/categorize";
import { db } from "@/lib/db";

// POST /api/transactions/parse-natural — parse natural language into transaction fields
export async function POST(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { text } = body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "Text is required" },
      { status: 400 }
    );
  }

  if (text.length > 500) {
    return NextResponse.json(
      { error: "Text must be 500 characters or less" },
      { status: 400 }
    );
  }

  // Parse the natural language text
  const parsed = await parseNaturalLanguage(text.trim());

  // Try to match a category using the AI categorization system
  const categories = await db.category.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
  });

  let categoryId: string | null = null;
  let categoryName: string | null = null;

  if (parsed.description && categories.length > 0) {
    const catResult = await categorizeTransaction(
      parsed.suggestedCategory || parsed.description,
      categories,
      parsed.amount || undefined
    );
    categoryId = catResult.categoryId;
    categoryName = catResult.suggestedName;
  }

  return NextResponse.json({
    type: parsed.type,
    amount: parsed.amount,
    currency: parsed.currency,
    description: parsed.description,
    source: parsed.source || null,
    date: parsed.date || null,
    categoryId,
    categoryName,
    originalText: text.trim(),
  });
}
