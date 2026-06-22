import { uploadKey } from "./types";
import type { ResolvedUploadDoc, UploadRef } from "./types";

export interface MediaResolver {
  resolve: (
    refs: UploadRef[],
    locale: string | undefined
  ) => Promise<Map<string, ResolvedUploadDoc>>;
  invalidate: () => void;
}

interface FindResponse {
  docs?: Array<ResolvedUploadDoc & { id?: unknown }>;
}

async function fetchDocs(
  apiRoute: string,
  collection: string,
  ids: Array<string | number>,
  locale: string | undefined
): Promise<Map<string, ResolvedUploadDoc>> {
  const params = new URLSearchParams({ depth: "0", limit: String(ids.length) });
  if (locale) params.set("locale", locale);
  ids.forEach((id, i) => params.set(`where[id][in][${i}]`, String(id)));

  try {
    const res = await fetch(`${apiRoute}/${collection}?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return new Map();
    const body = (await res.json()) as FindResponse;

    return new Map(
      (body.docs ?? [])
        .filter((d) => d.id !== undefined && d.id !== null)
        .map((d) => [String(d.id), d])
    );
  } catch {
    return new Map();
  }
}

export function createMediaResolver(apiRoute: string): MediaResolver {
  const cache = new Map<string, ResolvedUploadDoc | null>();
  const cacheKey = (ref: UploadRef, locale: string | undefined) =>
    `${uploadKey(ref)}:${locale ?? ""}`;

  return {
    async resolve(refs, locale) {
      const missing = refs.filter((ref) => !cache.has(cacheKey(ref, locale)));

      const byCollection = new Map<string, UploadRef[]>();
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
            locale
          );
          for (const ref of group) {
            cache.set(cacheKey(ref, locale), docs.get(String(ref.id)) ?? null);
          }
        })
      );

      const out = new Map<string, ResolvedUploadDoc>();
      for (const ref of refs) {
        const doc = cache.get(cacheKey(ref, locale));
        if (doc) out.set(uploadKey(ref), doc);
      }

      return out;
    },
    invalidate() {
      cache.clear();
    },
  };
}
