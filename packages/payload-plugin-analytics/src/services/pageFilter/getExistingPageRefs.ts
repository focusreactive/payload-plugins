import type { Payload } from "payload";
import type { ResolvedPagesConfig } from "../../config/resolvePagesConfig";
import { formatPageRef } from "../../utils/page/formatPageRef";

interface Page {
  id: string | number;
}

async function findIds(payload: Payload, slug: string, publishedOnly: boolean): Promise<Page[]> {
  const base = {
    collection: slug,
    depth: 0,
    pagination: false as const,
    select: { id: true },
    overrideAccess: true,
  };

  if (!publishedOnly) {
    const res = await payload.find(base as never);

    return res.docs as Page[];
  }

  try {
    const res = await payload.find({
      ...base,
      where: {
        _status: { equals: "published" },
      },
    } as never);

    return res.docs as Page[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!(/_status/u.test(msg) || /not a valid/iu.test(msg))) throw err;

    const res = await payload.find(base as never);

    return res.docs as Array<{ id: string | number }>;
  }
}

export async function getExistingPageRefs(payload: Payload, config: ResolvedPagesConfig): Promise<Set<string>> {
  const refs = new Set<string>(config.syntheticRefs);

  for (const { slug, publishedOnly } of config.collections) {
    const docs = await findIds(payload, slug, publishedOnly);

    for (const doc of docs) refs.add(formatPageRef(slug, doc.id));
  }

  return refs;
}
