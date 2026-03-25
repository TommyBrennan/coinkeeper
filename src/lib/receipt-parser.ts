import Anthropic from "@anthropic-ai/sdk";

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ParsedReceipt {
  merchant: string | null;
  date: string | null; // ISO date string
  currency: string | null;
  lineItems: ReceiptLineItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  rawText: string | null;
}

const SYSTEM_PROMPT = `You are a receipt parser. Analyze the receipt image and extract structured data.

Extract the following:
1. **merchant** — store/restaurant name
2. **date** — purchase date in YYYY-MM-DD format (use null if not visible)
3. **currency** — 3-letter currency code (e.g., USD, EUR, GBP). Infer from currency symbols: $ → USD, € → EUR, £ → GBP, ¥ → JPY, ₽ → RUB. If ambiguous, use USD.
4. **lineItems** — array of purchased items, each with:
   - name: product/item name
   - quantity: number of units (default 1)
   - unitPrice: price per unit
   - totalPrice: quantity × unitPrice
5. **subtotal** — pre-tax total (null if not shown)
6. **tax** — tax amount (null if not shown)
7. **total** — final total amount

Rules:
- Amounts should be plain numbers (no currency symbols)
- If an item's quantity or unit price is unclear, set quantity=1 and unitPrice=totalPrice
- Parse ALL visible line items, not just a summary
- If the receipt is unclear or not a receipt, return all nulls with an empty lineItems array

Respond with ONLY valid JSON in this exact format:
{
  "merchant": "Store Name" | null,
  "date": "YYYY-MM-DD" | null,
  "currency": "USD" | null,
  "lineItems": [{"name": "Item", "quantity": 1, "unitPrice": 5.99, "totalPrice": 5.99}],
  "subtotal": 10.00 | null,
  "tax": 0.80 | null,
  "total": 10.80 | null
}`;

export async function parseReceiptImage(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ParsedReceipt> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      merchant: null,
      date: null,
      currency: null,
      lineItems: [],
      subtotal: null,
      tax: null,
      total: null,
      rawText: null,
    };
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: "Parse this receipt and extract all information as JSON.",
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return emptyResult();
    }

    // Extract JSON from response (handle possible markdown code blocks)
    let jsonText = textBlock.text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonText);

    return {
      merchant: parsed.merchant || null,
      date: parsed.date || null,
      currency: parsed.currency || null,
      lineItems: Array.isArray(parsed.lineItems)
        ? parsed.lineItems.map((item: Record<string, unknown>) => ({
            name: String(item.name || "Unknown item"),
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            totalPrice: Number(item.totalPrice) || 0,
          }))
        : [],
      subtotal: typeof parsed.subtotal === "number" ? parsed.subtotal : null,
      tax: typeof parsed.tax === "number" ? parsed.tax : null,
      total: typeof parsed.total === "number" ? parsed.total : null,
      rawText: textBlock.text,
    };
  } catch (error) {
    console.error("Receipt parsing failed:", error);
    return emptyResult();
  }
}

function emptyResult(): ParsedReceipt {
  return {
    merchant: null,
    date: null,
    currency: null,
    lineItems: [],
    subtotal: null,
    tax: null,
    total: null,
    rawText: null,
  };
}
