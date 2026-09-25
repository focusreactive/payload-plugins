import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

import { cacheTag } from "@/lib/utils/cacheTags";
import { revalidateScopedTag } from "@/lib/utils/scopedCache";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";

export const revalidateRedirects: CollectionAfterChangeHook = async ({ doc, req }) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating redirects`);
    const locale = getLocaleFromRequest(req);

    revalidateScopedTag(cacheTag({ locale, type: "redirect" }), "max");
    payload.logger.info(`Revalidated redirects for locale: ${locale}`);
  }

  return doc;
};

// A deleted redirect has no single locale to key off - the document (and every locale's value it
// carried) is gone in one action - so this busts the shared "redirects" tag that getRedirects
// puts on every locale's cache entry, rather than guessing one locale from the request.
export const revalidateRedirectsOnDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    revalidateScopedTag("redirects", "max");
    payload.logger.info(`Revalidated redirects after delete`);
  }

  return doc;
};
