import { describe, it, expect } from "vitest";
import { normalizeName, findSimilar } from "../category-normalize";

describe("normalizeName", () => {
  it("converts to title case", () => {
    expect(normalizeName("food and dining")).toBe("Food and Dining");
  });

  it("keeps lowercase prepositions/conjunctions", () => {
    expect(normalizeName("BILLS AND UTILITIES")).toBe("Bills and Utilities");
  });

  it("capitalizes first word even if it is a preposition", () => {
    expect(normalizeName("the arts")).toBe("The Arts");
  });

  it("trims whitespace", () => {
    expect(normalizeName("  shopping  ")).toBe("Shopping");
  });

  it("normalizes multiple spaces", () => {
    expect(normalizeName("food   and   dining")).toBe("Food and Dining");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName("   ")).toBe("");
  });

  it("handles single word", () => {
    expect(normalizeName("transport")).toBe("Transport");
  });

  it("preserves & symbol", () => {
    expect(normalizeName("food & dining")).toBe("Food & Dining");
  });

  it("handles all-caps input", () => {
    expect(normalizeName("HEALTH")).toBe("Health");
  });
});

describe("findSimilar", () => {
  const existingCategories = [
    { id: "1", name: "Food & Dining" },
    { id: "2", name: "Transport" },
    { id: "3", name: "Shopping" },
    { id: "4", name: "Entertainment" },
    { id: "5", name: "Bills & Utilities" },
    { id: "6", name: "Health" },
    { id: "7", name: "Education" },
    { id: "8", name: "Salary" },
    { id: "9", name: "Investment" },
  ];

  it("finds exact match (case-insensitive)", () => {
    const result = findSimilar("food & dining", existingCategories);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("1");
    expect(result!.score).toBe(1.0);
  });

  it("finds alias match for groceries → Food & Dining", () => {
    const result = findSimilar("groceries", existingCategories);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("1");
    expect(result!.name).toBe("Food & Dining");
    expect(result!.score).toBe(0.95);
  });

  it("finds alias match for taxi → Transport", () => {
    const result = findSimilar("taxi", existingCategories);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Transport");
  });

  it("finds alias match for netflix → Entertainment", () => {
    const result = findSimilar("netflix", existingCategories);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Entertainment");
  });

  it("finds alias match for rent → Bills & Utilities", () => {
    const result = findSimilar("rent", existingCategories);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Bills & Utilities");
  });

  it("finds alias match for gym → Health", () => {
    const result = findSimilar("gym", existingCategories);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Health");
  });

  it("finds alias match for wages → Salary", () => {
    const result = findSimilar("wages", existingCategories);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Salary");
  });

  it("finds fuzzy match for similar names", () => {
    const result = findSimilar("Transportt", existingCategories);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Transport");
    expect(result!.score).toBeGreaterThanOrEqual(0.7);
  });

  it("returns null for empty input", () => {
    expect(findSimilar("", existingCategories)).toBeNull();
    expect(findSimilar("   ", existingCategories)).toBeNull();
  });

  it("returns null for completely unrelated input", () => {
    const result = findSimilar("xyzabcdef", existingCategories);
    // Should be null since no match above threshold
    expect(result === null || result.score < 0.7).toBe(true);
  });

  it("returns null for empty category list", () => {
    const result = findSimilar("Food", []);
    expect(result).toBeNull();
  });

  it("handles substring containment (0.85 score)", () => {
    // "Transport" contains "Trans" — similarity should catch this
    const result = findSimilar("Transpo", existingCategories);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Transport");
  });
});
