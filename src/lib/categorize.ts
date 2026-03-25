import Anthropic from "@anthropic-ai/sdk";

export interface CategoryInfo {
  id: string;
  name: string;
}

export interface CategorizationResult {
  categoryId: string | null;
  suggestedName: string | null;
  confidence: "high" | "medium" | "low";
  isNew: boolean;
}

const SYSTEM_PROMPT = `You are a financial transaction categorizer. Given a transaction description and a list of existing categories, your job is to:

1. Pick the BEST matching existing category, OR
2. Suggest a new category name if none fit well.

Rules:
- Prefer matching an existing category whenever reasonable
- If suggesting a new category, use a short, clear name (2-3 words max, Title Case)
- Normalize similar concepts (e.g., "Groceries" maps to "Food & Dining" if it exists)
- Return your confidence: "high" if very sure, "medium" if reasonable guess, "low" if uncertain

Respond with ONLY valid JSON in this exact format:
{"match": "exact category name" | null, "newCategory": "suggested name" | null, "confidence": "high" | "medium" | "low"}

If you match an existing category, set "match" to the exact category name and "newCategory" to null.
If you suggest a new category, set "match" to null and "newCategory" to the name.
Never set both to non-null.`;

function buildUserPrompt(
  description: string,
  amount: number | undefined,
  categories: CategoryInfo[]
): string {
  const catList = categories.map((c) => c.name).join(", ");
  let prompt = `Transaction: "${description}"`;
  if (amount !== undefined) {
    prompt += ` (amount: ${amount})`;
  }
  prompt += `\n\nExisting categories: [${catList}]`;
  return prompt;
}

interface AIResponse {
  match: string | null;
  newCategory: string | null;
  confidence: "high" | "medium" | "low";
}

export async function categorizeTransaction(
  description: string,
  categories: CategoryInfo[],
  amount?: number
): Promise<CategorizationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Graceful degradation: no API key configured
    return {
      categoryId: null,
      suggestedName: null,
      confidence: "low",
      isNew: false,
    };
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(description, amount, categories),
        },
      ],
    });

    // Extract text response
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return {
        categoryId: null,
        suggestedName: null,
        confidence: "low",
        isNew: false,
      };
    }

    const parsed: AIResponse = JSON.parse(textBlock.text);

    // Match to existing category
    if (parsed.match) {
      const matchedCategory = categories.find(
        (c) => c.name.toLowerCase() === parsed.match!.toLowerCase()
      );
      if (matchedCategory) {
        return {
          categoryId: matchedCategory.id,
          suggestedName: matchedCategory.name,
          confidence: parsed.confidence || "medium",
          isNew: false,
        };
      }
      // AI returned a name that doesn't match any existing category — treat as new suggestion
      return {
        categoryId: null,
        suggestedName: parsed.match,
        confidence: parsed.confidence || "low",
        isNew: true,
      };
    }

    // New category suggestion
    if (parsed.newCategory) {
      return {
        categoryId: null,
        suggestedName: parsed.newCategory,
        confidence: parsed.confidence || "medium",
        isNew: true,
      };
    }

    return {
      categoryId: null,
      suggestedName: null,
      confidence: "low",
      isNew: false,
    };
  } catch (error) {
    console.error("AI categorization failed:", error);
    // Graceful degradation on any error
    return {
      categoryId: null,
      suggestedName: null,
      confidence: "low",
      isNew: false,
    };
  }
}
