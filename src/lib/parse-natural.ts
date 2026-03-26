import Anthropic from "@anthropic-ai/sdk";

export interface ParsedTransaction {
  type: "expense" | "income" | "transfer";
  amount: number;
  currency: string;
  description: string;
  source?: string; // for income
  suggestedCategory?: string;
  date?: string; // ISO date if mentioned
}

const SYSTEM_PROMPT = `You are a financial transaction parser. Given a natural language description of a transaction, extract structured data.

Rules:
- Determine the type: "expense" (spending money), "income" (receiving money), or "transfer" (moving between accounts)
- Keywords indicating expense: "spent", "paid", "bought", "cost", "for", or just an item with price
- Keywords indicating income: "earned", "received", "got paid", "salary", "paycheck", "income"
- Keywords indicating transfer: "transfer", "moved", "sent to account"
- Extract the amount as a positive number
- Detect currency from symbols ($, €, £) or codes (USD, EUR, GBP, etc.). Default to "USD" if unclear
- Extract a concise description of what the transaction is for
- For income, extract the source (employer, client, etc.) if mentioned
- Suggest a category name (short, 2-3 words, Title Case) that best describes the transaction
- If a date is mentioned (e.g. "yesterday", "last Friday", "March 15"), convert to ISO format. Use the current date context provided. If no date mentioned, omit the field.

Respond with ONLY valid JSON:
{"type": "expense"|"income"|"transfer", "amount": number, "currency": "USD", "description": "string", "source": "string"|null, "suggestedCategory": "string", "date": "YYYY-MM-DD"|null}`;

function buildPrompt(text: string): string {
  const today = new Date().toISOString().split("T")[0];
  return `Today is ${today}. Parse this transaction:\n\n"${text}"`;
}

/**
 * Parse natural language text into structured transaction data using AI.
 * Falls back to regex parsing if AI is unavailable.
 */
export async function parseNaturalLanguage(
  text: string
): Promise<ParsedTransaction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPrompt(text) }],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        const parsed = JSON.parse(textBlock.text);
        return {
          type: parsed.type || "expense",
          amount: typeof parsed.amount === "number" && parsed.amount > 0 ? parsed.amount : 0,
          currency: parsed.currency || "USD",
          description: parsed.description || text,
          source: parsed.source || undefined,
          suggestedCategory: parsed.suggestedCategory || undefined,
          date: parsed.date || undefined,
        };
      }
    } catch (error) {
      console.error("AI natural language parsing failed:", error);
    }
  }

  // Fallback: regex-based parsing
  return parseWithRegex(text);
}

/**
 * Regex fallback parser for when AI is unavailable.
 * Extracts amount, currency, and basic description from text.
 */
export function parseWithRegex(text: string): ParsedTransaction {
  const normalized = text.trim();

  // Detect type from keywords
  let type: "expense" | "income" | "transfer" = "expense";
  const lowerText = normalized.toLowerCase();
  if (
    lowerText.includes("earned") ||
    lowerText.includes("received") ||
    lowerText.includes("got paid") ||
    lowerText.includes("salary") ||
    lowerText.includes("paycheck") ||
    lowerText.includes("income")
  ) {
    type = "income";
  } else if (
    lowerText.includes("transfer") ||
    lowerText.includes("moved to")
  ) {
    type = "transfer";
  }

  // Extract currency and amount
  // Match patterns like: $25, 25$, 25 USD, €15.50, 15.50 EUR, etc.
  let currency = "USD";
  let amount = 0;

  // Currency symbol before amount: $25.50, €15, £100
  const symbolBeforeMatch = normalized.match(
    /([€£¥₹]|\$)\s*(\d+(?:[.,]\d{1,2})?)/
  );
  // Currency symbol after amount: 25$, 15€
  const symbolAfterMatch = normalized.match(
    /(\d+(?:[.,]\d{1,2})?)\s*([€£¥₹$])/
  );
  // Currency code: 25 USD, 100 EUR, EUR 50
  const codeAfterMatch = normalized.match(
    /(\d+(?:[.,]\d{1,2})?)\s*(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|SEK|NOK|DKK|PLN|CZK|HUF|RUB|TRY|BRL|MXN|INR|CNY|KRW|SGD|HKD|TWD|THB|MYR|IDR|PHP|VND|ZAR|ILS|AED|SAR)/i
  );
  const codeBeforeMatch = normalized.match(
    /(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|SEK|NOK|DKK|PLN|CZK|HUF|RUB|TRY|BRL|MXN|INR|CNY|KRW|SGD|HKD|TWD|THB|MYR|IDR|PHP|VND|ZAR|ILS|AED|SAR)\s*(\d+(?:[.,]\d{1,2})?)/i
  );
  // Plain number
  const plainNumber = normalized.match(/(\d+(?:[.,]\d{1,2})?)/);

  const currencySymbols: Record<string, string> = {
    $: "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    "₹": "INR",
  };

  if (symbolBeforeMatch) {
    currency = currencySymbols[symbolBeforeMatch[1]] || "USD";
    amount = parseFloat(symbolBeforeMatch[2].replace(",", "."));
  } else if (symbolAfterMatch) {
    currency = currencySymbols[symbolAfterMatch[2]] || "USD";
    amount = parseFloat(symbolAfterMatch[1].replace(",", "."));
  } else if (codeAfterMatch) {
    amount = parseFloat(codeAfterMatch[1].replace(",", "."));
    currency = codeAfterMatch[2].toUpperCase();
  } else if (codeBeforeMatch) {
    currency = codeBeforeMatch[1].toUpperCase();
    amount = parseFloat(codeBeforeMatch[2].replace(",", "."));
  } else if (plainNumber) {
    amount = parseFloat(plainNumber[1].replace(",", "."));
  }

  // Extract description: remove amount/currency parts
  let description = normalized
    .replace(/[€£¥₹$]\s*\d+(?:[.,]\d{1,2})?/, "")
    .replace(/\d+(?:[.,]\d{1,2})?\s*[€£¥₹$]/, "")
    .replace(
      /\d+(?:[.,]\d{1,2})?\s*(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|SEK|NOK|DKK|PLN|CZK|HUF|RUB|TRY|BRL|MXN|INR|CNY|KRW|SGD|HKD|TWD|THB|MYR|IDR|PHP|VND|ZAR|ILS|AED|SAR)/gi,
      ""
    )
    .replace(
      /(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|SEK|NOK|DKK|PLN|CZK|HUF|RUB|TRY|BRL|MXN|INR|CNY|KRW|SGD|HKD|TWD|THB|MYR|IDR|PHP|VND|ZAR|ILS|AED|SAR)\s*\d+(?:[.,]\d{1,2})?/gi,
      ""
    )
    .replace(/\d+(?:[.,]\d{1,2})?/, "")
    .replace(
      /\b(spent|paid|bought|earned|received|got paid|for|on|at)\b/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!description) {
    description = type === "income" ? "Income" : "Expense";
  }

  return {
    type,
    amount,
    currency,
    description,
  };
}
