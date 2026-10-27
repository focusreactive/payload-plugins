import type { CollectionAfterChangeHook } from "payload";

import { upsertPageEmbedding } from "@/collections/Page/hooks/indexEmbedding";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
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

  const editedLocale = getLocaleFromRequest(req);

  // Every locale is revalidated because locale fallback can render this block on pages of other locales.
  for (const { code: locale } of I18N_CONFIG.locales) {
    const { docs: pages } = await payload.find({
      collection: "page",
      depth: 0,
      locale,
      overrideAccess: true,
      pagination: false,
      req,
      where: { _status: { equals: "published" }, id: { in: pageIds } },
    });

    for (const page of pages) {
      revalidatePageCache({ doc: page, locale, payload });

      if (locale === editedLocale && !context.skipEmbedding) {
        await upsertPageEmbedding({ locale, page, req });
      }
    }
  }

  return doc;
};
