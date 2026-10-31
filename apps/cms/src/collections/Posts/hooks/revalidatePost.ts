import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from "payload";

import { ALL_LOCALES } from "@/lib/config/i18n";
import { cacheTag } from "@/lib/utils/cacheTags";
import { revalidateScopedTag } from "@/lib/utils/scopedCache";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
import type { Locale } from "@/lib/types";
import type { Post } from "@/payload-types";

function revalidatePostTags(slug: string, locales: readonly Locale[], payload: Payload) {
  payload.logger?.info?.(`Revalidating post with slug: ${slug}`);

  // Revalidates this post AND all other posts (via postsList tag),
  // ensuring related articles sections on other posts stay up to date.
  for (const locale of locales) {
    revalidateScopedTag(cacheTag({ locale, slug, type: "post" }), "max");
    revalidateScopedTag(cacheTag({ locale, type: "postsList" }), "max");
  }
}

export const revalidatePost: CollectionAfterChangeHook<Post> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    const locale = getLocaleFromRequest(req);

    // `_status` is not localized: a status change or a delete affects every locale.
    if (doc._status === "published") {
      const statusChanged = previousDoc?._status !== doc._status;
      revalidatePostTags(doc?.slug ?? "", statusChanged ? ALL_LOCALES : [locale], payload);
      revalidateScopedTag(cacheTag({ type: "sitemap" }), "max");
    }

    if (previousDoc?._status === "published" && doc._status !== "published") {
      revalidatePostTags(previousDoc?.slug ?? "", ALL_LOCALES, payload);
      revalidateScopedTag(cacheTag({ type: "sitemap" }), "max");
    }
  }
  return doc;
};

export const revalidateDelete: CollectionAfterDeleteHook<Post> = async ({ doc, req }) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    revalidatePostTags(doc?.slug ?? "", ALL_LOCALES, payload);
    revalidateScopedTag(cacheTag({ type: "sitemap" }), "max");
  }

  return doc;
};
