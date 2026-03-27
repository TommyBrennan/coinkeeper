import { describe, it, expect } from "vitest";
import { normalizeProductName } from "../products";

describe("normalizeProductName", () => {
  it("lowercases the name", () => {
    expect(normalizeProductName("Whole Milk 2%")).toBe("whole milk 2%");
  });

  it("trims whitespace", () => {
    expect(normalizeProductName("  milk  ")).toBe("milk");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeProductName("whole   milk   2%")).toBe("whole milk 2%");
  });

  it("handles empty string", () => {
    expect(normalizeProductName("")).toBe("");
  });

  it("handles already normalized name", () => {
    expect(normalizeProductName("organic eggs")).toBe("organic eggs");
  });

  it("handles tabs and newlines", () => {
    expect(normalizeProductName("brown\trice\n1kg")).toBe("brown rice 1kg");
  });
});
