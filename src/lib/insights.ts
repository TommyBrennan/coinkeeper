import Anthropic from "@anthropic-ai/sdk";

export interface Insight {
  type: "spending_pattern" | "budget_recommendation" | "savings_opportunity" | "monthly_summary" | "alert";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category?: string;
  amount?: number;
  currency?: string;
}

export interface InsightResponse {
  insights: Insight[];
  generatedAt: string;
  period: string;
  summary: string;
}

export interface FinancialData {
  spendingByCategory: Array<{
    name: string;
    total: number;
    count: number;
    percentage: number;
  }>;
  trends: Array<{
    month: string;
    monthLabel: string;
    income: number;
    expense: number;
    net: number;
  }>;
  totalExpenses: number;
  totalIncome: number;
  currency: string;
  transactionCount: number;
  accountCount: number;
  period: string;
}

const SYSTEM_PROMPT = `You are an expert personal finance advisor analyzing a user's spending data. Generate actionable, specific financial insights based on the data provided.

Rules:
- Be specific — reference actual numbers, categories, and trends from the data
- Be actionable — each insight should suggest a concrete step the user can take
- Be concise — keep each insight description to 1-2 sentences
- Prioritize: "high" for urgent issues (overspending, negative savings), "medium" for opportunities, "low" for informational
- Generate 4-8 insights covering different types
- Always include at least one monthly_summary insight

Insight types:
- "spending_pattern": Notable patterns in spending behavior (e.g., top category consuming X% of budget)
- "budget_recommendation": Specific suggestions to improve budget allocation
- "savings_opportunity": Areas where the user could reduce spending
- "monthly_summary": Overview of recent financial performance
- "alert": Warning about concerning trends (negative savings, spending spikes)

Respond with ONLY valid JSON in this exact format:
{
  "summary": "One-sentence overall financial health assessment",
  "insights": [
    {
      "type": "spending_pattern|budget_recommendation|savings_opportunity|monthly_summary|alert",
      "title": "Short descriptive title (5-8 words)",
      "description": "Actionable insight with specific numbers",
      "priority": "high|medium|low",
      "category": "related spending category name or null",
      "amount": related amount as number or null,
      "currency": "currency code or null"
    }
  ]
}`;

function buildUserPrompt(data: FinancialData): string {
  const parts: string[] = [];

  parts.push(`=== Financial Summary (${data.period}) ===`);
  parts.push(`Currency: ${data.currency}`);
  parts.push(`Total Income: ${data.totalIncome.toFixed(2)}`);
  parts.push(`Total Expenses: ${data.totalExpenses.toFixed(2)}`);
  parts.push(`Net Savings: ${(data.totalIncome - data.totalExpenses).toFixed(2)}`);
  parts.push(`Transactions: ${data.transactionCount}`);
  parts.push(`Accounts: ${data.accountCount}`);

  if (data.spendingByCategory.length > 0) {
    parts.push(`\n=== Spending by Category ===`);
    for (const cat of data.spendingByCategory) {
      parts.push(`- ${cat.name}: ${cat.total.toFixed(2)} (${cat.percentage}% of total, ${cat.count} transactions)`);
    }
  }

  if (data.trends.length > 0) {
    parts.push(`\n=== Monthly Trends ===`);
    for (const month of data.trends) {
      parts.push(`- ${month.monthLabel}: Income ${month.income.toFixed(2)}, Expenses ${month.expense.toFixed(2)}, Net ${month.net.toFixed(2)}`);
    }

    // Calculate month-over-month changes
    if (data.trends.length >= 2) {
      const latest = data.trends[data.trends.length - 1];
      const previous = data.trends[data.trends.length - 2];
      if (previous.expense > 0) {
        const expenseChange = ((latest.expense - previous.expense) / previous.expense * 100).toFixed(1);
        parts.push(`\nMonth-over-month expense change: ${expenseChange}%`);
      }
      if (previous.income > 0) {
        const incomeChange = ((latest.income - previous.income) / previous.income * 100).toFixed(1);
        parts.push(`Month-over-month income change: ${incomeChange}%`);
      }
    }
  }

  parts.push(`\nPlease analyze this data and provide financial insights.`);

  return parts.join("\n");
}

interface AIInsightResponse {
  summary: string;
  insights: Insight[];
}

export async function generateInsights(data: FinancialData): Promise<InsightResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      insights: [],
      generatedAt: new Date().toISOString(),
      period: data.period,
      summary: "AI insights unavailable — no API key configured.",
    };
  }

  if (data.transactionCount === 0) {
    return {
      insights: [],
      generatedAt: new Date().toISOString(),
      period: data.period,
      summary: "Not enough transaction data to generate insights. Start adding transactions to see AI-powered analysis.",
    };
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(data),
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Handle potential markdown code blocks in response
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed: AIInsightResponse = JSON.parse(jsonText);

    // Validate and clean insights
    const validTypes = ["spending_pattern", "budget_recommendation", "savings_opportunity", "monthly_summary", "alert"];
    const validPriorities = ["high", "medium", "low"];

    const insights: Insight[] = (parsed.insights || [])
      .filter((i) => validTypes.includes(i.type) && validPriorities.includes(i.priority))
      .map((i) => ({
        type: i.type,
        title: i.title || "Insight",
        description: i.description || "",
        priority: i.priority,
        category: i.category || undefined,
        amount: typeof i.amount === "number" ? Math.round(i.amount * 100) / 100 : undefined,
        currency: i.currency || undefined,
      }));

    return {
      insights,
      generatedAt: new Date().toISOString(),
      period: data.period,
      summary: parsed.summary || "Financial analysis complete.",
    };
  } catch (error) {
    console.error("AI insights generation failed:", error);
    return {
      insights: [],
      generatedAt: new Date().toISOString(),
      period: data.period,
      summary: "Unable to generate insights at this time. Please try again later.",
    };
  }
}
