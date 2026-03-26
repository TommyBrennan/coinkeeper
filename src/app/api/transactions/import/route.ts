import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getSpaceContext, checkSpacePermission, getSpaceAccountIds } from "@/lib/space-context";

interface ImportError {
  row: number;
  message: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z]/g, "");
}

// POST /api/transactions/import — import transactions from CSV
export async function POST(request: NextRequest) {
  const { user, error } = await requireApiUser();
  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getSpaceContext(user.id);

  // Check space permissions
  if (context.spaceId) {
    const perm = await checkSpacePermission(user.id, context.spaceId, "editor");
    if (!perm.allowed) {
      return NextResponse.json(
        { error: "Viewers cannot import transactions in this space" },
        { status: 403 }
      );
    }
  }

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.name.endsWith(".csv")) {
    return NextResponse.json({ error: "File must be a CSV" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return NextResponse.json(
      { error: "CSV must have a header row and at least one data row" },
      { status: 400 }
    );
  }

  // Parse header
  const headerFields = parseCsvLine(lines[0]).map(normalizeHeader);

  // Map column indices
  const colMap: Record<string, number> = {};
  const knownColumns = ["date", "type", "amount", "currency", "description", "category", "account", "fromaccount", "toaccount"];
  for (let i = 0; i < headerFields.length; i++) {
    const normalized = headerFields[i];
    if (knownColumns.includes(normalized)) {
      colMap[normalized] = i;
    }
  }

  // Require at least date, type, amount
  if (colMap.date === undefined || colMap.type === undefined || colMap.amount === undefined) {
    return NextResponse.json(
      { error: "CSV must have at least Date, Type, and Amount columns" },
      { status: 400 }
    );
  }

  // Load user's accounts for matching
  let accounts;
  if (context.spaceId) {
    const spaceAccountIds = await getSpaceAccountIds(context.spaceId);
    accounts = await db.account.findMany({
      where: { id: { in: spaceAccountIds } },
    });
  } else {
    accounts = await db.account.findMany({
      where: { userId: user.id },
    });
  }

  const accountByName = new Map(
    accounts.map((a) => [a.name.toLowerCase(), a])
  );

  // Load user's categories for matching
  const categories = await db.category.findMany({
    where: { userId: user.id },
  });
  const categoryByName = new Map(
    categories.map((c) => [c.name.toLowerCase(), c])
  );

  const errors: ImportError[] = [];
  let imported = 0;
  let skipped = 0;

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const rowNum = i + 1; // 1-based for user display

    try {
      // Parse date
      const dateStr = fields[colMap.date] || "";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        errors.push({ row: rowNum, message: `Invalid date: "${dateStr}"` });
        skipped++;
        continue;
      }

      // Parse type
      const typeRaw = (fields[colMap.type] || "").toLowerCase();
      const validTypes = ["expense", "income", "transfer"];
      if (!validTypes.includes(typeRaw)) {
        errors.push({ row: rowNum, message: `Invalid type: "${typeRaw}". Must be expense, income, or transfer` });
        skipped++;
        continue;
      }

      // Parse amount
      const amountStr = fields[colMap.amount] || "";
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        errors.push({ row: rowNum, message: `Invalid amount: "${amountStr}"` });
        skipped++;
        continue;
      }

      const currency = (colMap.currency !== undefined ? fields[colMap.currency] : "") || "USD";
      const description = colMap.description !== undefined ? fields[colMap.description] || "" : "";

      // Resolve account
      // Support "Account" (single), or "From Account"/"To Account" (separate)
      let fromAccountId: string | null = null;
      let toAccountId: string | null = null;

      if (colMap.fromaccount !== undefined || colMap.toaccount !== undefined) {
        // Separate from/to columns
        if (colMap.fromaccount !== undefined) {
          const name = (fields[colMap.fromaccount] || "").toLowerCase();
          if (name) {
            const acc = accountByName.get(name);
            if (!acc) {
              errors.push({ row: rowNum, message: `Unknown account: "${fields[colMap.fromaccount]}"` });
              skipped++;
              continue;
            }
            fromAccountId = acc.id;
          }
        }
        if (colMap.toaccount !== undefined) {
          const name = (fields[colMap.toaccount] || "").toLowerCase();
          if (name) {
            const acc = accountByName.get(name);
            if (!acc) {
              errors.push({ row: rowNum, message: `Unknown account: "${fields[colMap.toaccount]}"` });
              skipped++;
              continue;
            }
            toAccountId = acc.id;
          }
        }
      } else if (colMap.account !== undefined) {
        // Single account column
        const accountName = (fields[colMap.account] || "").toLowerCase();
        if (accountName) {
          const acc = accountByName.get(accountName);
          if (!acc) {
            errors.push({ row: rowNum, message: `Unknown account: "${fields[colMap.account]}"` });
            skipped++;
            continue;
          }
          if (typeRaw === "expense") {
            fromAccountId = acc.id;
          } else if (typeRaw === "income") {
            toAccountId = acc.id;
          }
        }
      }

      // Validate account requirements
      if (typeRaw === "expense" && !fromAccountId) {
        errors.push({ row: rowNum, message: "Expense requires an account (From Account or Account column)" });
        skipped++;
        continue;
      }
      if (typeRaw === "income" && !toAccountId) {
        errors.push({ row: rowNum, message: "Income requires an account (To Account or Account column)" });
        skipped++;
        continue;
      }
      if (typeRaw === "transfer" && (!fromAccountId || !toAccountId)) {
        errors.push({ row: rowNum, message: "Transfer requires both From Account and To Account" });
        skipped++;
        continue;
      }

      // Resolve category (create if needed)
      let categoryId: string | null = null;
      const categoryName = colMap.category !== undefined ? fields[colMap.category] || "" : "";
      if (categoryName) {
        const existing = categoryByName.get(categoryName.toLowerCase());
        if (existing) {
          categoryId = existing.id;
        } else {
          // Create new category
          const newCat = await db.category.create({
            data: {
              name: categoryName,
              userId: user.id,
            },
          });
          categoryByName.set(categoryName.toLowerCase(), newCat);
          categoryId = newCat.id;
        }
      }

      // Create transaction and update balance
      await db.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: typeRaw,
            amount,
            currency,
            description: description || null,
            date,
            categoryId,
            fromAccountId,
            toAccountId,
            exchangeRate: typeRaw === "transfer" ? 1 : null,
            toAmount: typeRaw === "transfer" ? amount : null,
          },
        });

        // Update balances
        if (typeRaw === "expense" && fromAccountId) {
          await tx.account.update({
            where: { id: fromAccountId },
            data: { balance: { decrement: amount } },
          });
        } else if (typeRaw === "income" && toAccountId) {
          await tx.account.update({
            where: { id: toAccountId },
            data: { balance: { increment: amount } },
          });
        } else if (typeRaw === "transfer") {
          if (fromAccountId) {
            await tx.account.update({
              where: { id: fromAccountId },
              data: { balance: { decrement: amount } },
            });
          }
          if (toAccountId) {
            await tx.account.update({
              where: { id: toAccountId },
              data: { balance: { increment: amount } },
            });
          }
        }
      });

      imported++;
    } catch (err) {
      errors.push({ row: rowNum, message: `Unexpected error: ${err instanceof Error ? err.message : "unknown"}` });
      skipped++;
    }
  }

  return NextResponse.json({
    imported,
    skipped,
    total: lines.length - 1,
    errors: errors.slice(0, 50), // Limit error details
  });
}
