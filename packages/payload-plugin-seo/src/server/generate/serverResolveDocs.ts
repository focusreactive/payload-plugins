import type { Payload } from "payload";
import type { DocQuery, DocStore } from "../../types/config";

type Doc = Record<string, unknown>;

function key(collection: string, id: string | number): string {
  return `${collection}:${id}`;
}

async function runQuery(
  payload: Payload,
  query: DocQuery,
  locale: string | undefined
): Promise<Array<[string, Doc]>> {
  const ids = [...new Set(query.ids.map(String))];
  if (ids.length === 0) return [];

  const select = query.select ? Object.fromEntries(query.select.map((f) => [f, true])) : undefined;

  const result = await payload.find({
    collection: query.collection as never,
    where: { id: { in: ids } },
    depth: query.depth ?? 0,
    limit: ids.length,
    pagination: false,
    overrideAccess: true,
    ...(locale ? { locale: locale as never } : {}),
    ...(select ? { select: select as never } : {}),
  });

  return (result.docs as Array<Doc & { id?: unknown }>)
    .filter(
      (d): d is Doc & { id: string | number } =>
        typeof d.id === "string" || typeof d.id === "number"
    )
    .map((d) => [key(query.collection, d.id), d] as [string, Doc]);
}

export function createServerResolveDocs(
  payload: Payload,
  locale: string | undefined
): (queries: DocQuery[]) => Promise<DocStore> {
  return async function resolveDocs(queries: DocQuery[]): Promise<DocStore> {
    const store = new Map<string, Doc>();
    const results = await Promise.all(queries.map((q) => runQuery(payload, q, locale)));

    for (const entries of results) for (const [k, doc] of entries) store.set(k, doc);

    return {
      get: (collection, id) => store.get(key(collection, id)),
    };
  };
}
