import { TranslationFilterSchema } from "../../../core/domain/selection/index.js";
import type { TranslationFilter } from "../../../core/domain/selection/index.js";

/**
 * No filters means the whole document, so an empty list stores as `null` rather than `"[]"` — the
 * two must not be told apart downstream.
 */
export const storedFilters = (filters?: readonly TranslationFilter[]): string | null =>
  filters && filters.length > 0 ? JSON.stringify(filters) : null;

function readJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * An entry the parser rejects is dropped. A value that is not a list — or one whose every entry is
 * rejected — reads as no filters at all, which means the whole document.
 */
export function filtersFromStore(stored: string | null): TranslationFilter[] {
  if (stored === null) return [];
  const parsed = readJson(stored);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => {
    const filter = TranslationFilterSchema.safeParse(entry);
    return filter.success ? [filter.data] : [];
  });
}
