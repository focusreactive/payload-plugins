import type { InclusiveCategory, Status } from "./types/analysis";

export interface RawInclusiveFlag {
  category: string;
  term: string;
  suggestion: string;
  location: string;
}

export interface InclusiveResult {
  ringScore: number;
  status: Status;
  categories: InclusiveCategory[];
  cleanCategories: string[];
}

function flagsToRing(count: number): number {
  return Math.max(0, 100 - count * 10);
}

export function scoreInclusive(flags: RawInclusiveFlag[], allCategories: string[]): InclusiveResult {
  const byCategory = new Map<string, InclusiveCategory>();

  for (const f of flags) {
    const cat = byCategory.get(f.category) ?? { name: f.category, flags: [] };
    cat.flags.push({
      term: f.term,
      suggestion: f.suggestion,
      location: f.location,
    });
    byCategory.set(f.category, cat);
  }

  const categories = [...byCategory.values()];
  const flaggedNames = new Set(categories.map((c) => c.name));
  const cleanCategories = allCategories.filter((name) => !flaggedNames.has(name));
  const ringScore = flagsToRing(flags.length);
  const status: Status = ringScore >= 80 ? "good" : ringScore >= 50 ? "warn" : "bad";

  return { ringScore, status, categories, cleanCategories };
}
