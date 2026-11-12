import type { PayloadRequest, Where } from "payload";
import { KEYPHRASES_COLLECTION_SLUG, LINK_SOURCE_PAGE_SIZE } from "../../constants";
import type { DocTarget } from "../../keyphrases/docTarget";
import type { DocRef, KeyphraseRow, LinkSourceRow } from "./types";

export function rowWhere(target: DocTarget): Where {
  return {
    and: [{ docCollection: { equals: target.collection } }, { docId: { equals: target.docId } }],
  };
}

export async function findRow(req: PayloadRequest, ref: DocRef): Promise<KeyphraseRow | undefined> {
  const { docs } = await req.payload.find({
    collection: KEYPHRASES_COLLECTION_SLUG,
    where: { and: [rowWhere(ref), { locale: { equals: ref.locale } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });

  return docs[0] as KeyphraseRow | undefined;
}

const LINK_SOURCE_SELECT = { docCollection: true, docId: true, keyphrases: true } as const;

function otherRowsWhere(self: DocRef, collections: string[], where: Where[] = []): Where {
  return {
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
  };
}

export async function findRowsSharingIntent(
  req: PayloadRequest,
  self: DocRef,
  intent: string,
  collections: string[]
): Promise<KeyphraseRow[]> {
  const { docs } = await req.payload.find({
    collection: KEYPHRASES_COLLECTION_SLUG,
    where: otherRowsWhere(self, collections, [{ intents: { equals: intent } }]),
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  });

  return docs as KeyphraseRow[];
}

export async function* findLinkSourcePages(
  req: PayloadRequest,
  self: DocRef,
  collections: string[]
): AsyncGenerator<LinkSourceRow[]> {
  let hasNextPage = true;

  for (let page = 1; hasNextPage; page += 1) {
    const result = await req.payload.find({
      collection: KEYPHRASES_COLLECTION_SLUG,
      where: otherRowsWhere(self, collections),
      select: LINK_SOURCE_SELECT,
      page,
      limit: LINK_SOURCE_PAGE_SIZE,
      depth: 0,
      overrideAccess: true,
      req,
    });

    hasNextPage = result.hasNextPage === true;
    yield result.docs as LinkSourceRow[];
  }
}
