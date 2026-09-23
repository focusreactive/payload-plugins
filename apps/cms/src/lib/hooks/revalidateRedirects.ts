import type { CollectionAfterChangeHook } from "payload";

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
