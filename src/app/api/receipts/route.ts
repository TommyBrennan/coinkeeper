import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseReceiptImage, ParsedReceipt } from "@/lib/receipt-parser";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "receipts");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type AllowedMimeType = (typeof ALLOWED_TYPES)[number];

function isAllowedType(type: string): type is AllowedMimeType {
  return ALLOWED_TYPES.includes(type as AllowedMimeType);
}

// GET /api/receipts — list receipts for current user
export async function GET(request: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where = { userId: user.id };

  const [receipts, total] = await Promise.all([
    db.receipt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        transactions: {
          select: {
            id: true,
            description: true,
            amount: true,
            type: true,
          },
        },
      },
    }),
    db.receipt.count({ where }),
  ]);

  return NextResponse.json({ receipts, total });
}

// POST /api/receipts — upload receipt image and optionally parse with AI
export async function POST(request: NextRequest) {
  const user = await requireUser();

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data" },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Failed to parse form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: 'No file provided. Use field name "file".' },
      { status: 400 }
    );
  }

  // Validate file type
  if (!isAllowedType(file.type)) {
    return NextResponse.json(
      {
        error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  // Read file into buffer
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  // Generate unique filename
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  const publicPath = `/uploads/receipts/${filename}`;

  // Ensure upload directory exists
  await mkdir(UPLOAD_DIR, { recursive: true });

  // Write file to disk
  await writeFile(filePath, buffer);

  // Check if auto-parse is requested (default: true)
  const autoParse = formData.get("parse") !== "false";

  let parsedData: ParsedReceipt | null = null;

  if (autoParse) {
    parsedData = await parseReceiptImage(base64, file.type as AllowedMimeType);
  }

  // Create receipt record
  const receipt = await db.receipt.create({
    data: {
      userId: user.id,
      imagePath: publicPath,
      merchant: parsedData?.merchant || null,
      total: parsedData?.total || null,
      currency: parsedData?.currency || null,
      rawText: parsedData?.rawText || null,
      parsedData: parsedData ? JSON.stringify(parsedData) : null,
      processedAt: parsedData ? new Date() : null,
    },
  });

  return NextResponse.json(
    {
      receipt: {
        id: receipt.id,
        imagePath: receipt.imagePath,
        merchant: receipt.merchant,
        total: receipt.total,
        currency: receipt.currency,
        processedAt: receipt.processedAt,
        parsedData: parsedData
          ? {
              merchant: parsedData.merchant,
              date: parsedData.date,
              currency: parsedData.currency,
              lineItems: parsedData.lineItems,
              subtotal: parsedData.subtotal,
              tax: parsedData.tax,
              total: parsedData.total,
            }
          : null,
      },
      warning: !process.env.ANTHROPIC_API_KEY
        ? "ANTHROPIC_API_KEY not configured — receipt stored but not parsed"
        : undefined,
    },
    { status: 201 }
  );
}
