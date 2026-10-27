import type { CollectionAfterChangeHook } from "payload";

import { PAGE_EMBEDDING_DEPTH, upsertPageEmbedding } from "@/collections/Page/hooks/indexEmbedding";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { revalidatePageCache } from "@/lib/utils/revalidatePageCache";
import type { GlobalBlock } from "@/payload-types";

import { findPagesUsingGlobalBlock } from "../findPagesUsingGlobalBlock";

export const revalidatePagesUsingGlobalBlock: CollectionAfterChangeHook<GlobalBlock> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const { context, payload } = req;
  const affectsPublished = doc._status === "published" || previousDoc?._status === "published";

  if (context.disableRevalidate || !affectsPublished) {
    return doc;
  }

  const pageIds = (await findPagesUsingGlobalBlock({ id: doc.id, req })).map((p) => p.id);
  if (pageIds.length === 0) {
    return doc;
  }

  // Every locale is revalidated and re-indexed because locale fallback can render this block — and
  // its edited text — on pages of other locales, not just the one that was edited.
  for (const { code: locale } of I18N_CONFIG.locales) {
    const { docs: pages } = await payload.find({
      collection: "page",
      depth: PAGE_EMBEDDING_DEPTH,
      locale,
      overrideAccess: true,
      pagination: false,
      req,
      where: { _status: { equals: "published" }, id: { in: pageIds } },
    });

    for (const page of pages) {
      revalidatePageCache({ doc: page, locale, payload });

      if (!context.skipEmbedding) {
        await upsertPageEmbedding({ locale, page, req });
      }
    }
  }

  return doc;
};
