import type { PayloadRequest, SelectType, Where } from "payload";
import { KEYPHRASES_COLLECTION_SLUG } from "../../constants";
import type { DocRef, KeyphraseRow, LinkSourceRow } from "./types";

export async function findRow(req: PayloadRequest, ref: DocRef): Promise<KeyphraseRow | undefined> {
  const { docs } = await req.payload.find({
    collection: KEYPHRASES_COLLECTION_SLUG,
    where: {
      and: [
        { docCollection: { equals: ref.collection } },
        { docId: { equals: ref.docId } },
        { locale: { equals: ref.locale } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });

  return docs[0] as KeyphraseRow | undefined;
}

interface OtherRowsOptions {
  where?: Where[];
  select?: SelectType;
}

const LINK_SOURCE_SELECT = { docCollection: true, docId: true, keyphrases: true } as const;

async function findOtherRows(
  req: PayloadRequest,
  self: DocRef,
  collections: string[],
  { where = [], select }: OtherRowsOptions = {}
): Promise<unknown[]> {
  const { docs } = await req.payload.find({
    collection: KEYPHRASES_COLLECTION_SLUG,
    where: {
      and: [
        { locale: { equals: self.locale } },
        { docCollection: { in: collections } },
        {
          or: [
            { docCollection: { not_equals: self.collection } },
            { docId: { not_equals: self.docId } },
          ],
        },
        ...where,
      ],
    },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
    ...(select ? { select } : {}),
  });

  return docs;
}

export async function findRowsSharingIntent(
  req: PayloadRequest,
  self: DocRef,
  intent: string,
  collections: string[]
): Promise<KeyphraseRow[]> {
  const rows = await findOtherRows(req, self, collections, {
    where: [{ intents: { equals: intent } }],
  });

  return rows as KeyphraseRow[];
}

export async function findLinkSourceRows(
  req: PayloadRequest,
  self: DocRef,
  collections: string[]
): Promise<LinkSourceRow[]> {
  const rows = await findOtherRows(req, self, collections, { select: LINK_SOURCE_SELECT });

  return rows as LinkSourceRow[];
}
