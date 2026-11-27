import type { ContentExtractor, PreviewPathResolver } from "../types/config";

const STORE_KEY = "__FR_SEO_CONTENT_EXTRACTORS__";
const PREVIEW_PATH_STORE_KEY = "__FR_SEO_PREVIEW_PATH_RESOLVERS__";

function storeAt<Value>(key: string): Map<string, Value> {
  const g = globalThis as Record<string, unknown>;

  if (!(g[key] instanceof Map)) g[key] = new Map<string, Value>();

  return g[key] as Map<string, Value>;
}

const store = (): Map<string, ContentExtractor> => storeAt<ContentExtractor>(STORE_KEY);

export function registerContentExtractors(map: Record<string, ContentExtractor>): void {
  const s = store();

  for (const [key, fn] of Object.entries(map)) s.set(key, fn);
}

export function resolveContentExtractor(
  key: string | null | undefined
): ContentExtractor | undefined {
  if (!key) return undefined;

  return store().get(key);
}

/**
 * Registers, per collection slug, how the search-result preview builds a document's public path.
 * Call it from the same admin-mounted client module that registers the content extractors.
 */
export function registerPreviewPathResolvers(map: Record<string, PreviewPathResolver>): void {
  const s = storeAt<PreviewPathResolver>(PREVIEW_PATH_STORE_KEY);

  for (const [collectionSlug, fn] of Object.entries(map)) s.set(collectionSlug, fn);
}

export function resolvePreviewPathResolver(
  collectionSlug: string | null | undefined
): PreviewPathResolver | undefined {
  if (!collectionSlug) return undefined;

  return storeAt<PreviewPathResolver>(PREVIEW_PATH_STORE_KEY).get(collectionSlug);
}
