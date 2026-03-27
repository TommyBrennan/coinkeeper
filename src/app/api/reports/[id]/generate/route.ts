import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext, getSpaceAccountIds } from "@/lib/space-context";
import PDFDocument from "pdfkit";

interface ReportFilters {
  type?: string;
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  periodPreset?: string; // 7d, 30d, 90d, 1y, all
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function resolvePeriodPreset(preset: string): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  let from: Date;

  switch (preset) {
    case "7d":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(0); // all time
  }

  return { from, to };
}

// POST /api/reports/[id]/generate — execute a saved report and return data
export async function POST(
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

  let filters: ReportFilters = {};
  try { filters = JSON.parse(report.filters); } catch { /* invalid JSON, default to empty filters */ }
  const context = await getSpaceContext(user.id);

  // Build where clause
  const where: Record<string, unknown> = {};

  if (context.spaceId) {
    const spaceAccountIds = await getSpaceAccountIds(context.spaceId);
    if (spaceAccountIds.length === 0) {
      return await returnEmpty(report.format, report.name);
    }
    where.OR = [
      { fromAccountId: { in: spaceAccountIds } },
      { toAccountId: { in: spaceAccountIds } },
    ];

    if (filters.accountId) {
      if (!spaceAccountIds.includes(filters.accountId)) {
        return await returnEmpty(report.format, report.name);
      }
      where.OR = [
        { fromAccountId: filters.accountId },
        { toAccountId: filters.accountId },
      ];
    }
  } else {
    where.userId = user.id;
    if (filters.accountId) {
      delete where.userId;
      where.AND = [
        { userId: user.id },
        {
          OR: [
            { fromAccountId: filters.accountId },
            { toAccountId: filters.accountId },
          ],
        },
      ];
    }
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  // Date range: use explicit dates or period preset
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from)
      (where.date as Record<string, unknown>).gte = new Date(filters.from);
    if (filters.to)
      (where.date as Record<string, unknown>).lte = new Date(filters.to);
  } else if (filters.periodPreset && filters.periodPreset !== "all") {
    const { from, to } = resolvePeriodPreset(filters.periodPreset);
    where.date = { gte: from, lte: to };
  }

  const transactions = await db.transaction.findMany({
    where,
    include: {
      category: true,
      fromAccount: { select: { id: true, name: true, currency: true } },
      toAccount: { select: { id: true, name: true, currency: true } },
    },
    orderBy: { date: "desc" },
  });

  // Update lastRunAt
  await db.savedReport.update({
    where: { id },
    data: { lastRunAt: new Date() },
  });

  // Compute summary
  const summary = {
    totalTransactions: transactions.length,
    totalExpenses: 0,
    totalIncome: 0,
    totalTransfers: 0,
    netAmount: 0,
  };

  for (const txn of transactions) {
    if (txn.type === "expense") summary.totalExpenses += txn.amount;
    else if (txn.type === "income") summary.totalIncome += txn.amount;
    else if (txn.type === "transfer") summary.totalTransfers += txn.amount;
  }
  summary.netAmount = summary.totalIncome - summary.totalExpenses;

  if (report.format === "csv") {
    return generateCsv(transactions, report.name);
  }

  if (report.format === "pdf") {
    return await generatePdf(transactions, summary, report.name);
  }

  // JSON format
  return NextResponse.json({
    report: {
      id: report.id,
      name: report.name,
      generatedAt: new Date().toISOString(),
      filters,
    },
    summary: {
      ...summary,
      totalExpenses: Math.round(summary.totalExpenses * 100) / 100,
      totalIncome: Math.round(summary.totalIncome * 100) / 100,
      totalTransfers: Math.round(summary.totalTransfers * 100) / 100,
      netAmount: Math.round(summary.netAmount * 100) / 100,
    },
    transactions: transactions.map((txn) => ({
      date: new Date(txn.date).toISOString().split("T")[0],
      type: txn.type,
      amount: txn.amount,
      currency: txn.currency,
      description: txn.description || "",
      source: txn.source || "",
      category: txn.category?.name || "",
      fromAccount: txn.fromAccount?.name || "",
      toAccount: txn.toAccount?.name || "",
      exchangeRate: txn.exchangeRate,
      toAmount: txn.toAmount,
    })),
  });
}

async function returnEmpty(format: string, name: string) {
  if (format === "csv") {
    const headers =
      "Date,Type,Amount,Currency,Description,Category,From Account,To Account,Exchange Rate,To Amount";
    const filename = `${slugify(name)}-${today()}.csv`;
    return new Response(headers, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }
  if (format === "pdf") {
    const emptySummary = {
      totalTransactions: 0,
      totalExpenses: 0,
      totalIncome: 0,
      totalTransfers: 0,
      netAmount: 0,
    };
    return await generatePdf([], emptySummary, name);
  }
  return NextResponse.json({
    report: { name, generatedAt: new Date().toISOString() },
    summary: {
      totalTransactions: 0,
      totalExpenses: 0,
      totalIncome: 0,
      totalTransfers: 0,
      netAmount: 0,
    },
    transactions: [],
  });
}

function generateCsv(
  transactions: Array<{
    date: Date;
    type: string;
    amount: number;
    currency: string;
    description: string | null;
    category: { name: string } | null;
    fromAccount: { name: string } | null;
    toAccount: { name: string } | null;
    exchangeRate: number | null;
    toAmount: number | null;
  }>,
  reportName: string
) {
  const headers = [
    "Date",
    "Type",
    "Amount",
    "Currency",
    "Description",
    "Category",
    "From Account",
    "To Account",
    "Exchange Rate",
    "To Amount",
  ];

  const rows = transactions.map((txn) =>
    [
      new Date(txn.date).toISOString().split("T")[0],
      txn.type,
      txn.amount.toString(),
      txn.currency,
      txn.description || "",
      txn.category?.name || "",
      txn.fromAccount?.name || "",
      txn.toAccount?.name || "",
      txn.exchangeRate != null ? txn.exchangeRate.toString() : "",
      txn.toAmount != null ? txn.toAmount.toString() : "",
    ]
      .map(escapeCsvField)
      .join(",")
  );

  const csvContent =
    headers.map(escapeCsvField).join(",") + "\n" + rows.join("\n");

  const filename = `${slugify(reportName)}-${today()}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function generatePdf(
  transactions: Array<{
    date: Date;
    type: string;
    amount: number;
    currency: string;
    description: string | null;
    category: { name: string } | null;
    fromAccount: { name: string } | null;
    toAccount: { name: string } | null;
    exchangeRate: number | null;
    toAmount: number | null;
  }>,
  summary: {
    totalTransactions: number;
    totalExpenses: number;
    totalIncome: number;
    totalTransfers: number;
    netAmount: number;
  },
  reportName: string
): Promise<Response> {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Title
  doc.fontSize(20).font("Helvetica-Bold").text(reportName, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica").fillColor("#666666")
    .text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, { align: "center" });
  doc.moveDown(1);

  // Summary section
  doc.fillColor("#000000").fontSize(14).font("Helvetica-Bold").text("Summary");
  doc.moveDown(0.4);
  doc.fontSize(10).font("Helvetica").fillColor("#333333");

  const summaryItems = [
    ["Total Transactions", summary.totalTransactions.toString()],
    ["Total Income", `+${summary.totalIncome.toFixed(2)}`],
    ["Total Expenses", `-${summary.totalExpenses.toFixed(2)}`],
    ["Total Transfers", summary.totalTransfers.toFixed(2)],
    ["Net Amount", summary.netAmount.toFixed(2)],
  ];

  for (const [label, value] of summaryItems) {
    doc.font("Helvetica").text(`${label}: `, { continued: true });
    doc.font("Helvetica-Bold").text(value);
  }

  doc.moveDown(1);

  // Transactions table
  doc.fillColor("#000000").fontSize(14).font("Helvetica-Bold").text("Transactions");
  doc.moveDown(0.5);

  if (transactions.length === 0) {
    doc.fontSize(10).font("Helvetica").fillColor("#666666")
      .text("No transactions found matching the report filters.");
  } else {
    // Table columns: Date, Type, Amount, Description, Category
    const colWidths = [70, 55, 80, 200, 110];
    const colHeaders = ["Date", "Type", "Amount", "Description", "Category"];
    const tableLeft = 40;
    const rowHeight = 18;

    // Table header
    let y = doc.y;
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#444444");

    // Header background
    doc.save();
    doc.rect(tableLeft, y - 2, colWidths.reduce((a, b) => a + b, 0), rowHeight)
      .fill("#f0f0f0");
    doc.restore();

    doc.fillColor("#444444");
    let x = tableLeft;
    for (let i = 0; i < colHeaders.length; i++) {
      doc.text(colHeaders[i], x, y, { width: colWidths[i], align: i === 2 ? "right" : "left" });
      x += colWidths[i];
    }

    y += rowHeight;

    // Table rows
    doc.font("Helvetica").fontSize(8).fillColor("#333333");

    for (const txn of transactions) {
      // Check if we need a new page
      if (y + rowHeight > doc.page.height - 50) {
        doc.addPage();
        y = 40;

        // Reprint header on new page
        doc.save();
        doc.rect(tableLeft, y - 2, colWidths.reduce((a, b) => a + b, 0), rowHeight)
          .fill("#f0f0f0");
        doc.restore();

        doc.font("Helvetica-Bold").fontSize(8).fillColor("#444444");
        x = tableLeft;
        for (let i = 0; i < colHeaders.length; i++) {
          doc.text(colHeaders[i], x, y, { width: colWidths[i], align: i === 2 ? "right" : "left" });
          x += colWidths[i];
        }
        y += rowHeight;
        doc.font("Helvetica").fontSize(8).fillColor("#333333");
      }

      // Alternating row background
      if (transactions.indexOf(txn) % 2 === 1) {
        doc.save();
        doc.rect(tableLeft, y - 2, colWidths.reduce((a, b) => a + b, 0), rowHeight)
          .fill("#fafafa");
        doc.restore();
        doc.fillColor("#333333");
      }

      x = tableLeft;
      const date = new Date(txn.date).toISOString().split("T")[0];
      const desc = txn.description || "—";
      const cat = txn.category?.name || "—";
      const amt = `${txn.amount.toFixed(2)} ${txn.currency}`;

      doc.text(date, x, y, { width: colWidths[0] });
      x += colWidths[0];
      doc.text(txn.type, x, y, { width: colWidths[1] });
      x += colWidths[1];
      doc.text(amt, x, y, { width: colWidths[2], align: "right" });
      x += colWidths[2];
      doc.text(desc.substring(0, 40), x, y, { width: colWidths[3] });
      x += colWidths[3];
      doc.text(cat.substring(0, 20), x, y, { width: colWidths[4] });

      y += rowHeight;
    }

    doc.moveDown(0.5);
    doc.fontSize(8).fillColor("#888888")
      .text(`${transactions.length} transaction${transactions.length === 1 ? "" : "s"} total`, tableLeft, y + 5);
  }

  // Add page numbers
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font("Helvetica").fillColor("#aaaaaa")
      .text(
        `Page ${i + 1} of ${pageCount}`,
        40,
        doc.page.height - 30,
        { align: "center", width: doc.page.width - 80 }
      );
  }

  // Wait for the PDF to finish generating
  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.end();
  });

  const filename = `${slugify(reportName)}-${today()}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}
