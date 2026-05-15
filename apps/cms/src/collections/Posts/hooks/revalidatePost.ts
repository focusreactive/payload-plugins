import { revalidateTag } from "next/cache";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Payload,
} from "payload";

import { cacheTag } from "@/core/lib/cacheTags";
import { getLocaleFromRequest } from "@/core/lib/getLocaleFromRequest";
import type { Locale } from "@/core/types";
import type { Post } from "@/payload-types";

function revalidatePostTags(slug: string, locale: Locale, payload: Payload) {
  payload.logger?.info?.(`Revalidating post with slug: ${slug}`);

  // Revalidates this post AND all other posts (via postsList tag),
  // ensuring related articles sections on other posts stay up to date.
  revalidateTag(cacheTag({ locale, slug, type: "post" }), "max");
  revalidateTag(cacheTag({ locale, type: "postsList" }), "max");
}

export const revalidatePost: CollectionAfterChangeHook<Post> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    const locale = getLocaleFromRequest(req);

    if (doc._status === "published") {
      revalidatePostTags(doc?.slug ?? "", locale, payload);
      revalidateTag(cacheTag({ type: "sitemap" }), "max");
    }

    if (previousDoc?._status === "published" && doc._status !== "published") {
      revalidatePostTags(previousDoc?.slug ?? "", locale, payload);
      revalidateTag(cacheTag({ type: "sitemap" }), "max");
    }
  }
  return doc;
};

export const revalidateDelete: CollectionAfterDeleteHook<Post> = async ({
  doc,
  req,
}) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    const locale = getLocaleFromRequest(req);

    revalidatePostTags(doc?.slug ?? "", locale, payload);
    revalidateTag(cacheTag({ type: "sitemap" }), "max");
  }

  return doc;
};
