import type { PayloadRequest } from "payload";
import { KEYPHRASES_COLLECTION_SLUG, LINK_SOURCE_PAGE_SIZE } from "../../constants";
import { otherRowsWhere } from "../keyphrases/rows";
import type { DocRef, KeyphraseRow } from "../keyphrases/types";

export type LinkSourceRow = Pick<KeyphraseRow, "docCollection" | "docId" | "keyphrases">;

const LINK_SOURCE_SELECT = { docCollection: true, docId: true, keyphrases: true } as const;

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
