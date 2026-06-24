import type { ContentExtractor } from "../types/config";

const STORE_KEY = "__FR_SEO_CONTENT_EXTRACTORS__";

function store(): Map<string, ContentExtractor> {
  const g = globalThis as Record<string, unknown>;

  if (!(g[STORE_KEY] instanceof Map)) g[STORE_KEY] = new Map<string, ContentExtractor>();

  return g[STORE_KEY] as Map<string, ContentExtractor>;
}

export function registerContentExtractors(map: Record<string, ContentExtractor>): void {
  const s = store();

  for (const [key, fn] of Object.entries(map)) s.set(key, fn);
}

export function resolveContentExtractor(key: string | null | undefined): ContentExtractor | undefined {
  if (!key) return undefined;

  return store().get(key);
}
