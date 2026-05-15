import type { GlobalAfterChangeHook } from "payload";

import { getLocaleFromRequest } from "@/core/lib/getLocaleFromRequest";
import { revalidateGlobalTags } from "@/dal/getGlobals";

export const revalidateSiteSettings: GlobalAfterChangeHook = async ({
  doc,
  req,
}) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    const locale = getLocaleFromRequest(req);
    revalidateGlobalTags({ collection: "site-settings", locale });
    payload.logger?.info?.(`Revalidated site-settings for locale: ${locale}`);
  }

  return doc;
};
