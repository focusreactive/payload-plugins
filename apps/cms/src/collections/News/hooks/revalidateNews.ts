import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

import { cacheTag } from "@/lib/utils/cacheTags";
import { revalidateScopedTag } from "@/lib/utils/scopedCache";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
import type { Locale } from "@/lib/types";
import type { News } from "@/payload-types";

function revalidateNewsTags(slug: string, locale: Locale) {
  revalidateScopedTag(cacheTag({ locale, slug, type: "newsItem" }), "max");
  revalidateScopedTag(cacheTag({ locale, type: "newsList" }), "max");
  revalidateScopedTag(cacheTag({ type: "sitemap" }), "max");
}

export const revalidateNews: CollectionAfterChangeHook<News> = ({ doc, previousDoc, req }) => {
  if (req.context.disableRevalidate) {
    return doc;
  }
  const locale = getLocaleFromRequest(req);

  if (doc._status === "published") {
    revalidateNewsTags(doc.slug, locale);
  }
  if (previousDoc?._status === "published" && previousDoc.slug !== doc.slug) {
    revalidateNewsTags(previousDoc.slug, locale);
  }
  if (previousDoc?._status === "published" && doc._status !== "published") {
    revalidateNewsTags(previousDoc.slug, locale);
  }
  return doc;
};

export const revalidateNewsDelete: CollectionAfterDeleteHook<News> = ({ doc, req }) => {
  if (!req.context.disableRevalidate) {
    revalidateNewsTags(doc.slug, getLocaleFromRequest(req));
  }
  return doc;
};
