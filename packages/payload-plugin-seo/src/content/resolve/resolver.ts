import { refKey } from "./types";
import type { DocRef, ResolvedDoc } from "./types";

export interface DocResolver {
  resolve: (refs: DocRef[], locale: string | undefined, depth: number) => Promise<Map<string, ResolvedDoc>>;
  invalidate: () => void;
}

interface FindResponse {
  docs?: Array<ResolvedDoc & { id?: unknown }>;
}

async function fetchDocs(apiRoute: string, collection: string, ids: Array<string | number>, locale: string | undefined, depth: number): Promise<Map<string, ResolvedDoc>> {
  const params = new URLSearchParams({
    depth: String(depth),
    limit: String(ids.length),
  });

  if (locale) params.set("locale", locale);

  ids.forEach((id, i) => params.set(`where[id][in][${i}]`, String(id)));

  try {
    const res = await fetch(`${apiRoute}/${collection}?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return new Map();

    const body = (await res.json()) as FindResponse;

    return new Map((body.docs ?? []).filter((d) => d.id !== undefined && d.id !== null).map((d) => [String(d.id), d]));
  } catch {
    return new Map();
  }
}

export function createDocResolver(apiRoute: string): DocResolver {
  const cache = new Map<string, ResolvedDoc | null>();
  const cacheKey = (ref: DocRef, locale: string | undefined, depth: number) => `${refKey(ref)}:${locale ?? ""}:${depth}`;

  return {
    async resolve(refs, locale, depth) {
      const missing = refs.filter((ref) => !cache.has(cacheKey(ref, locale, depth)));

      const byCollection = new Map<string, DocRef[]>();
      for (const ref of missing) {
        const group = byCollection.get(ref.collection) ?? [];
        group.push(ref);
        byCollection.set(ref.collection, group);
      }

      await Promise.all(
        [...byCollection.entries()].map(async ([collection, group]) => {
          const docs = await fetchDocs(
            apiRoute,
            collection,
            group.map((r) => r.id),
            locale,
            depth
          );

          for (const ref of group) cache.set(cacheKey(ref, locale, depth), docs.get(String(ref.id)) ?? null);
        })
      );

      const out = new Map<string, ResolvedDoc>();

      for (const ref of refs) {
        const doc = cache.get(cacheKey(ref, locale, depth));
        if (doc) out.set(refKey(ref), doc);
      }

      return out;
    },
    invalidate() {
      cache.clear();
    },
  };
}
