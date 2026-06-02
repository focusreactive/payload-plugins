import type { CollectionSlug, PayloadRequest } from "payload";

export interface AbExperimentRecord {
  manifestKey: string;
  parentDocId: string;
  parentCollection: string;
  locale: string | null;
  startedAt: string;
}

function toRecord(doc: Record<string, unknown>): AbExperimentRecord {
  return {
    manifestKey: String(doc.manifestKey ?? ""),
    parentDocId: String(doc.parentDocId ?? ""),
    parentCollection: String(doc.parentCollection ?? ""),
    locale: (doc.locale as string | null) ?? null,
    startedAt: String(doc.startedAt ?? ""),
  };
}

export async function getAbExperimentRecords(experimentsSlug: string, req: PayloadRequest): Promise<AbExperimentRecord[]> {
  const { docs } = await req.payload.find({
    collection: experimentsSlug as CollectionSlug,
    depth: 0,
    limit: 500,
    overrideAccess: true,
    req,
  });

  return (docs as Array<Record<string, unknown>>).map(toRecord);
}

export async function getAbExperimentRecordByKey(experimentsSlug: string, manifestKey: string, req: PayloadRequest): Promise<AbExperimentRecord | null> {
  const { docs } = await req.payload.find({
    collection: experimentsSlug as CollectionSlug,
    where: { manifestKey: { equals: manifestKey } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  });

  const doc = (docs as Array<Record<string, unknown>>)[0];

  return doc ? toRecord(doc) : null;
}
