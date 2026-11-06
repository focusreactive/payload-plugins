import type { Payload } from "payload";
import type { DocQuery, DocStore } from "../../types/config";
import { findDocsByIds } from "../findDocsByIds";

type Doc = Record<string, unknown>;

function key(collection: string, id: string | number): string {
  return `${collection}:${id}`;
}

async function runQuery(
  payload: Payload,
  query: DocQuery,
  locale: string | undefined
): Promise<Array<[string, Doc]>> {
  const docs = await findDocsByIds(payload, {
    collection: query.collection,
    ids: [...new Set(query.ids.map(String))],
    overrideAccess: true,
    depth: query.depth ?? 0,
    locale,
    select: query.select ? Object.fromEntries(query.select.map((f) => [f, true])) : undefined,
  });

  return docs.map((d) => [key(query.collection, d.id), d]);
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
