import type { PayloadRequest } from "payload";
import type { ResolvedPagesConfig } from "../../config/resolvePagesConfig";

export interface PageLabel {
  path: string;
  title: string;
}

function parseRef(ref: string) {
  const idx = ref.indexOf(":");

  if (idx <= 0) return null;

  return {
    collection: ref.slice(0, idx),
    id: ref.slice(idx + 1),
  };
}

export async function resolvePageLabels(
  req: PayloadRequest,
  config: ResolvedPagesConfig,
  refs: string[]
): Promise<Map<string, PageLabel>> {
  const unique = [...new Set(refs)];
  const result = new Map<string, PageLabel>();
  const byCollection = new Map<string, string[]>();
  const defaultLocale =
    (req.payload.config.localization && req.payload.config.localization.defaultLocale) || undefined;

  for (const ref of unique) {
    const parsed = parseRef(ref);

    if (parsed && config.collections.some((c) => c.slug === parsed.collection)) {
      const list = byCollection.get(parsed.collection) ?? [];

      list.push(parsed.id);
      byCollection.set(parsed.collection, list);
    }
  }

  const titleByRef = new Map<string, string>();

  for (const [collection, ids] of byCollection) {
    const titleField = config.collections.find((c) => c.slug === collection)?.titleField ?? "title";

    try {
      const res = await req.payload.find({
        collection,
        locale: defaultLocale,
        where: {
          id: {
            in: ids.map((id) => (Number.isNaN(Number(id)) ? id : Number(id))),
          },
        },
        select: {
          [titleField]: true,
        },
        depth: 0,
        pagination: false,
        overrideAccess: true,
      } as never);

      for (const doc of res.docs as Array<Record<string, unknown>>) {
        const title = doc[titleField];
        if (typeof title === "string" && title) titleByRef.set(`${collection}:${doc.id}`, title);
      }
    } catch {
      continue;
    }
  }

  for (const ref of unique) {
    let path = "";

    if (config.resolvePagePath) {
      try {
        path = (await config.resolvePagePath(ref, req)) || "";
      } catch {
        path = "";
      }
    }

    if (!path) path = ref;

    const title = titleByRef.get(ref) ?? (path !== ref ? path : ref);

    result.set(ref, { path, title });
  }

  return result;
}
