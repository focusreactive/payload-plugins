import { revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook } from "payload";

import { cacheTag } from "@/core/lib/cacheTags";
import { getLocaleFromRequest } from "@/core/lib/getLocaleFromRequest";

export const revalidateRedirects: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating redirects`);
    const locale = getLocaleFromRequest(req);

    revalidateTag(cacheTag({ locale, type: "redirect" }), "max");
    payload.logger.info(`Revalidated redirects for locale: ${locale}`);
  }

  return doc;
};
