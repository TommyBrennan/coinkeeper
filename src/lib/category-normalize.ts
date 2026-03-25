/**
 * Category normalization utilities.
 * Prevents duplicate categories by normalizing names, checking aliases,
 * and doing fuzzy string matching against existing categories.
 */

export interface CategoryMatch {
  id: string;
  name: string;
  score: number; // 0–1, higher is better
}

// ─── Alias map: common synonyms → canonical category name ──────────
// Keys are lowercase. Values must match default category names exactly.
const ALIAS_MAP: Record<string, string> = {
  // Food & Dining aliases
  groceries: "Food & Dining",
  "grocery shopping": "Food & Dining",
  restaurant: "Food & Dining",
  restaurants: "Food & Dining",
  "eating out": "Food & Dining",
  "food delivery": "Food & Dining",
  takeout: "Food & Dining",
  "take-out": "Food & Dining",
  takeaway: "Food & Dining",
  cafe: "Food & Dining",
  coffee: "Food & Dining",
  lunch: "Food & Dining",
  dinner: "Food & Dining",
  breakfast: "Food & Dining",
  snacks: "Food & Dining",
  "fast food": "Food & Dining",

  // Transport aliases
  taxi: "Transport",
  uber: "Transport",
  lyft: "Transport",
  "ride share": "Transport",
  rideshare: "Transport",
  gas: "Transport",
  fuel: "Transport",
  petrol: "Transport",
  parking: "Transport",
  "public transit": "Transport",
  bus: "Transport",
  metro: "Transport",
  subway: "Transport",
  train: "Transport",
  "car rental": "Transport",
  tolls: "Transport",
  commute: "Transport",
  transportation: "Transport",

  // Shopping aliases
  clothing: "Shopping",
  clothes: "Shopping",
  apparel: "Shopping",
  electronics: "Shopping",
  amazon: "Shopping",
  "online shopping": "Shopping",

  // Entertainment aliases
  movies: "Entertainment",
  cinema: "Entertainment",
  gaming: "Entertainment",
  games: "Entertainment",
  streaming: "Entertainment",
  spotify: "Entertainment",
  netflix: "Entertainment",
  concerts: "Entertainment",
  music: "Entertainment",

  // Bills & Utilities aliases
  rent: "Bills & Utilities",
  electricity: "Bills & Utilities",
  water: "Bills & Utilities",
  internet: "Bills & Utilities",
  phone: "Bills & Utilities",
  "mobile phone": "Bills & Utilities",
  insurance: "Bills & Utilities",
  utilities: "Bills & Utilities",
  subscription: "Bills & Utilities",
  subscriptions: "Bills & Utilities",

  // Health aliases
  medical: "Health",
  doctor: "Health",
  pharmacy: "Health",
  medicine: "Health",
  hospital: "Health",
  dentist: "Health",
  gym: "Health",
  fitness: "Health",
  healthcare: "Health",

  // Education aliases
  tuition: "Education",
  school: "Education",
  courses: "Education",
  "online course": "Education",
  books: "Education",
  textbooks: "Education",
  training: "Education",

  // Income aliases
  wages: "Salary",
  paycheck: "Salary",
  "pay check": "Salary",
  payroll: "Salary",

  // Investment aliases
  stocks: "Investment",
  "stock market": "Investment",
  crypto: "Investment",
  cryptocurrency: "Investment",
  trading: "Investment",
  "mutual funds": "Investment",
};

/**
 * Normalize a category name: trim whitespace, convert to Title Case.
 */
export function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  return trimmed
    .split(/\s+/)
    .map((word) => {
      // Keep short conjunctions/prepositions lowercase (unless first word)
      const lower = word.toLowerCase();
      if (["and", "or", "the", "a", "an", "of", "in", "for", "to", "with", "on", "at", "by"].includes(lower)) {
        return lower;
      }
      // Handle "&" and other symbols
      if (word.length === 1 && !word.match(/[a-zA-Z]/)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    // Capitalize first letter always
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Compute similarity score between two strings (0–1).
 * Uses normalized Levenshtein distance.
 */
function similarity(a: string, b: string): number {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();

  if (al === bl) return 1;

  // Check if one contains the other
  if (al.includes(bl) || bl.includes(al)) return 0.85;

  const maxLen = Math.max(al.length, bl.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(al, bl);
  return 1 - distance / maxLen;
}

const SIMILARITY_THRESHOLD = 0.7;

/**
 * Find the best matching existing category for a given name.
 * Checks: exact match → alias map → fuzzy match.
 *
 * @returns The best match above threshold, or null.
 */
export function findSimilar(
  name: string,
  existingCategories: { id: string; name: string }[]
): CategoryMatch | null {
  if (!name.trim()) return null;

  const normalized = normalizeName(name);
  const nameLower = normalized.toLowerCase();

  // 1. Exact match (case-insensitive)
  const exact = existingCategories.find(
    (c) => c.name.toLowerCase() === nameLower
  );
  if (exact) {
    return { id: exact.id, name: exact.name, score: 1.0 };
  }

  // 2. Alias map lookup
  const aliasTarget = ALIAS_MAP[nameLower];
  if (aliasTarget) {
    const aliasMatch = existingCategories.find(
      (c) => c.name.toLowerCase() === aliasTarget.toLowerCase()
    );
    if (aliasMatch) {
      return { id: aliasMatch.id, name: aliasMatch.name, score: 0.95 };
    }
  }

  // 3. Fuzzy match — find best similarity above threshold
  let bestMatch: CategoryMatch | null = null;

  for (const cat of existingCategories) {
    const score = similarity(normalized, cat.name);
    if (score >= SIMILARITY_THRESHOLD && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: cat.id, name: cat.name, score };
    }
  }

  return bestMatch;
}
