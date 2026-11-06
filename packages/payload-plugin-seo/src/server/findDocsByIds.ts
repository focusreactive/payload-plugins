import type { Payload, PayloadRequest, SelectType, Where } from "payload";

export type FoundDoc = Record<string, unknown> & { id: string | number };

interface FindDocsByIdsOptions {
  collection: string;
  ids: string[];
  overrideAccess: boolean;
  depth?: number;
  locale?: string;
  select?: SelectType;
  req?: PayloadRequest;
  where?: Where;
}

function hasId(doc: Record<string, unknown>): doc is FoundDoc {
  return typeof doc.id === "string" || typeof doc.id === "number";
}

export async function findDocsByIds(
  payload: Payload,
  { collection, ids, overrideAccess, depth = 0, locale, select, req, where }: FindDocsByIdsOptions
): Promise<FoundDoc[]> {
  if (ids.length === 0) return [];

  const byIds: Where = { id: { in: ids } };

  const { docs } = await payload.find({
    collection,
    where: where ? { and: [byIds, where] } : byIds,
    depth,
    pagination: false,
    overrideAccess,
    disableErrors: true,
    req,
    ...(locale ? { locale } : {}),
    ...(select ? { select } : {}),
  });

  return (docs as Array<Record<string, unknown>>).filter(hasId);
}
