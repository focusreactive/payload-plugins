import type { CollectionAfterChangeHook } from "payload";

import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
import { revalidatePageCache } from "@/lib/utils/revalidatePageCache";
import { revalidateGlobalTags } from "@/dal/getGlobals";
import type { Footer } from "@/payload-types";

const relationId = (rel: number | Footer | null | undefined) =>
  typeof rel === "object" ? rel?.id : rel;

export const revalidateResourcesUsingFooter: CollectionAfterChangeHook<Footer> = async ({
  doc,
  req,
}) => {
  const { payload, context } = req;

  if (!context.disableRevalidate) {
    const locale = getLocaleFromRequest(req);

    const siteSettings = await payload.findGlobal({
      depth: 1,
      slug: "site-settings",
    });

    if (
      relationId(siteSettings?.blog?.footer) === doc.id ||
      relationId(siteSettings?.notFound?.footer) === doc.id
    ) {
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
        footer: {
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
