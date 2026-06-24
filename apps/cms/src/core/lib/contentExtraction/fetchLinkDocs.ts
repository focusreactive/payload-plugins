import { linkRefKey } from "./links";
import type { LinkRef, LinkRelation, ResolvedLinkDoc } from "./links";

interface FindResponse {
  docs?: Array<ResolvedLinkDoc & { id?: unknown }>;
}

async function fetchByIds(apiRoute: string, collection: LinkRelation, ids: Array<string | number>, locale: string | undefined): Promise<Map<string, ResolvedLinkDoc>> {
  const params = new URLSearchParams({ depth: "0", limit: String(ids.length) });

  if (locale) params.set("locale", locale);

  ids.forEach((id, i) => params.set(`where[id][in][${i}]`, String(id)));

  try {
    const res = await fetch(`${apiRoute}/${collection}?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return new Map();

    const body = (await res.json()) as FindResponse;

    return new Map((body.docs ?? []).filter((d) => d.id !== undefined && d.id !== null).map((d) => [linkRefKey({ collection, id: d.id as string | number }), d]));
  } catch {
    return new Map();
  }
}

export async function fetchLinkDocs(refs: LinkRef[], opts: { apiRoute?: string; locale?: string }): Promise<Map<string, ResolvedLinkDoc>> {
  const out = new Map<string, ResolvedLinkDoc>();
  if (!opts.apiRoute || refs.length === 0) return out;

  const byCollection = new Map<LinkRelation, Array<string | number>>();
  for (const ref of refs) {
    const group = byCollection.get(ref.collection) ?? [];
    group.push(ref.id);
    byCollection.set(ref.collection, group);
  }

  await Promise.all(
    [...byCollection.entries()].map(async ([collection, ids]) => {
      const docs = await fetchByIds(opts.apiRoute as string, collection, ids, opts.locale);
      for (const [key, doc] of docs) out.set(key, doc);
    })
  );

  return out;
}
