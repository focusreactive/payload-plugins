import { revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from "payload";

import { cacheTag } from "@/lib/utils/cacheTags";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import type { GeneratedPage } from "@/payload-types";

// Every locale, not the request locale: publishing the Italian translation from
// the en view (or vice versa) must still refresh /it/online-doctor/..., and the
// it page may have cached an en-fallback narrative before the translation existed.
function revalidateGeneratedPageTags(slug: string, payload: Payload) {
  payload.logger?.info?.(`Revalidating generated page with slug: ${slug}`);
  for (const { code } of I18N_CONFIG.locales) {
    revalidateTag(cacheTag({ locale: code as Locale, slug, type: "generatedPage" }), "max");
  }
}

export const revalidateGeneratedPage: CollectionAfterChangeHook<GeneratedPage> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    if (doc._status === "published") {
      revalidateGeneratedPageTags(doc?.slug ?? "", payload);
    }

    if (previousDoc?._status === "published" && doc._status !== "published") {
      revalidateGeneratedPageTags(previousDoc?.slug ?? "", payload);
    }
  }
  return doc;
};

export const revalidateGeneratedPageDelete: CollectionAfterDeleteHook<GeneratedPage> = async ({
  doc,
  req,
}) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    revalidateGeneratedPageTags(doc?.slug ?? "", payload);
  }

  return doc;
};
