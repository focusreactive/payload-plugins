import type { CollectionEntry, NormalizedCollectionConfig } from "../../types";

const DEFAULT_TITLE_FIELD = "id";

export function normalizeCollections(entries?: CollectionEntry[]) {
  if (!entries) return null;

  const map = new Map<string, { titleField: string }>() as NormalizedCollectionConfig;

  for (const entry of entries) {
    map.set(entry.slug, {
      titleField: entry.titleField ?? DEFAULT_TITLE_FIELD,
    });
  }

  return map;
}
