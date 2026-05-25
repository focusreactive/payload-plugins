import type { CollectionAfterChangeHook } from "payload";

import { getLocaleFromRequest } from "@/core/lib/getLocaleFromRequest";
import { revalidatePageCache } from "@/core/lib/revalidatePageCache";
import { revalidateGlobalTags } from "@/dal/getGlobals";
import type { Header } from "@/payload-types";

export const revalidateResourcesUsingHeader: CollectionAfterChangeHook<
  Header
> = async ({ doc, req }) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    const locale = getLocaleFromRequest(req);

    const siteSettings = await payload.findGlobal({
      depth: 1,
      slug: "site-settings",
    });

    const headerId =
      typeof siteSettings?.header === "object"
        ? siteSettings.header?.id
        : siteSettings?.header;
    if (headerId === doc.id) {
      revalidateGlobalTags({ collection: "site-settings", locale });
      payload.logger?.info?.(`Revalidated site-settings for locale: ${locale}`);
    }

    const pages = await payload.find({
      collection: "page",
      select: {
        breadcrumbs: true,
        id: true,
      },
      where: {
        header: {
          equals: doc.id,
        },
      },
    });

    for (const page of pages.docs) {
      revalidatePageCache({ doc: page, locale, payload });
    }
  }

  return doc;
};
