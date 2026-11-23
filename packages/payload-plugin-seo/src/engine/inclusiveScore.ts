import type { InclusiveCategory, InclusiveCategoryId, Status } from "./types/analysis";

export interface RawInclusiveFlag {
  category: InclusiveCategoryId;
  term: string;
  suggestion: string;
  location: string;
}

export interface InclusiveResult {
  ringScore: number;
  status: Status;
  categories: InclusiveCategory[];
  cleanCategories: InclusiveCategoryId[];
}

function flagsToRing(count: number): number {
  return Math.max(0, 100 - count * 10);
}

export function scoreInclusive(
  flags: RawInclusiveFlag[],
  allCategories: InclusiveCategoryId[]
): InclusiveResult {
  const byCategory = new Map<InclusiveCategoryId, InclusiveCategory>();

  for (const f of flags) {
    const cat = byCategory.get(f.category) ?? { id: f.category, flags: [] };
    cat.flags.push({
      term: f.term,
      suggestion: f.suggestion,
      location: f.location,
    });
    byCategory.set(f.category, cat);
  }

  const categories = [...byCategory.values()];
  const flaggedIds = new Set(categories.map((c) => c.id));
  const cleanCategories = allCategories.filter((id) => !flaggedIds.has(id));
  const ringScore = flagsToRing(flags.length);
  const status: Status = ringScore >= 80 ? "good" : ringScore >= 50 ? "warn" : "bad";

  return { ringScore, status, categories, cleanCategories };
}
