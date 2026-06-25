import type { DocQuery, DocStore } from "../../types/config";

type Doc = Record<string, unknown>;

interface FindResponse {
  docs?: Array<Doc & { id?: unknown }>;
}

function key(collection: string, id: string | number): string {
  return `${collection}:${id}`;
}

async function fetchQuery(
  apiRoute: string,
  query: DocQuery,
  locale: string | undefined
): Promise<Array<[string, Doc]>> {
  const ids = [...new Set(query.ids.map(String))];
  if (ids.length === 0) return [];

  const params = new URLSearchParams({
    depth: String(query.depth ?? 0),
    limit: String(ids.length),
  });

  if (locale) params.set("locale", locale);

  ids.forEach((id, i) => params.set(`where[id][in][${i}]`, id));

  for (const field of query.select ?? []) params.set(`select[${field}]`, "true");

  try {
    const res = await fetch(`${apiRoute}/${query.collection}?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return [];

    const body = (await res.json()) as FindResponse;

    return (body.docs ?? [])
      .filter(
        (d): d is Doc & { id: string | number } =>
          typeof d.id === "string" || typeof d.id === "number"
      )
      .map((d) => [key(query.collection, d.id), d] as [string, Doc]);
  } catch {
    return [];
  }
}

export function createResolveDocs(
  apiRoute: string | undefined,
  locale: string | undefined
): (queries: DocQuery[]) => Promise<DocStore> {
  return async function resolveDocs(queries: DocQuery[]): Promise<DocStore> {
    const store = new Map<string, Doc>();

    if (apiRoute) {
      const results = await Promise.all(queries.map((q) => fetchQuery(apiRoute, q, locale)));

      for (const entries of results) for (const [k, doc] of entries) store.set(k, doc);
    }

    return {
      get: (collection, id) => store.get(key(collection, id)),
    };
  };
}
