import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { parseReceiptImage, ParsedReceipt } from "@/lib/receipt-parser";

const ALLOWED_MIME: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

// POST /api/receipts/[id]/parse — (re-)parse an existing receipt image with AI
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const receipt = await db.receipt.findUnique({ where: { id, userId: user.id } });
  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  // Read the stored image file
  const absolutePath = path.join(process.cwd(), "public", receipt.imagePath);
  let buffer: Buffer;
  try {
    buffer = await readFile(absolutePath);
  } catch {
    return NextResponse.json(
      { error: "Receipt image file not found on disk" },
      { status: 404 }
    );
  }

  // Determine MIME type from extension
  const ext = path.extname(receipt.imagePath).slice(1).toLowerCase();
  const mimeType = ALLOWED_MIME[ext];
  if (!mimeType) {
    return NextResponse.json(
      { error: `Unsupported image format: .${ext}` },
      { status: 400 }
    );
  }

  const base64 = buffer.toString("base64");
  let parsedData: ParsedReceipt;
  try {
    parsedData = await parseReceiptImage(base64, mimeType);
  } catch (err) {
    console.error("Receipt parsing failed:", err);
    return NextResponse.json(
      { error: "Failed to parse receipt image. The AI service may be unavailable." },
      { status: 502 }
    );
  }

  // Update receipt record with parsed data
  const updated = await db.receipt.update({
    where: { id },
    data: {
      merchant: parsedData.merchant || null,
      total: parsedData.total || null,
      currency: parsedData.currency || null,
      rawText: parsedData.rawText || null,
      parsedData: JSON.stringify(parsedData),
      processedAt: new Date(),
    },
  });

  return NextResponse.json({
    receipt: {
      id: updated.id,
      imagePath: updated.imagePath,
      merchant: updated.merchant,
      total: updated.total,
      currency: updated.currency,
      processedAt: updated.processedAt,
      parsedData: {
        merchant: parsedData.merchant,
        date: parsedData.date,
        currency: parsedData.currency,
        lineItems: parsedData.lineItems,
        subtotal: parsedData.subtotal,
        tax: parsedData.tax,
        total: parsedData.total,
      },
    },
    warning: !process.env.ANTHROPIC_API_KEY
      ? "ANTHROPIC_API_KEY not configured — parsing returned empty results"
      : undefined,
  });
}
