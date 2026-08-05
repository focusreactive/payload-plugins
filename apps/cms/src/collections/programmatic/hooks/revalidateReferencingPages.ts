import { revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook } from "payload";

import { cacheTag } from "@/lib/utils/cacheTags";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";

/**
 * Entities have no draft step - every save is live. A published generated page
 * renders entity data from its cache, so an entity edit must revalidate every
 * page that references it, in every locale ("edit the intro once, every city
 * page updates" is the core demo promise).
 */
export function revalidateReferencingPages(
  referenceField: "condition" | "city"
): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    const { payload, context } = req;
    if (context.disableRevalidate) return doc;

    const pages = await payload.find({
      collection: "generated-pages",
      depth: 0,
      limit: 200,
      overrideAccess: true,
      where: { [referenceField]: { equals: doc.id } },
    });

    for (const page of pages.docs) {
      if (!page.slug) continue;
      for (const { code } of I18N_CONFIG.locales) {
        revalidateTag(
          cacheTag({ locale: code as Locale, slug: page.slug, type: "generatedPage" }),
          "max"
        );
      }
    }

    if (pages.docs.length > 0) {
      payload.logger?.info?.(
        `Revalidated ${pages.docs.length} generated page(s) referencing ${referenceField} ${doc.id}`
      );
    }
    return doc;
  };
}
