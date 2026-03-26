/**
 * Product name normalization for matching across receipts.
 */

/**
 * Normalize a product name for deduplication/matching.
 * Lowercases, trims, and collapses multiple whitespace characters.
 */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
