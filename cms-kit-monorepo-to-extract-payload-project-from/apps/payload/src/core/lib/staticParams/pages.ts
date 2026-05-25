import configPromise from "@payload-config";
import { getPayload } from "payload";

import { I18N_CONFIG } from "@/core/config/i18n";
import type { Locale } from "@/core/types";

export type PageStaticParams = { locale: string; slug: string[] }[];

function isHomeSlug(slug: string[]): boolean {
  if (slug.length === 0) {return true;}
  if (slug.length === 1 && (slug[0] === "home" || slug[0] === "")) {return true;}
  return false;
}

export async function getMainSitePageStaticParams(): Promise<PageStaticParams> {
  const payload = await getPayload({ config: configPromise });

  const results: PageStaticParams = [];

  for (const localeConfig of I18N_CONFIG.locales) {
    const locale = localeConfig.code as Locale;

    const pages = await payload.find({
      collection: "page",
      depth: 2,
      draft: false,
      limit: 1000,
      locale,
      overrideAccess: true,
      pagination: false,
      select: {
        breadcrumbs: true,
        slug: true,
      },
      where: {
        _status: { equals: "published" },
      },
    });

    for (const page of pages.docs) {
      const slug =
        (page?.breadcrumbs?.length
          ? page.breadcrumbs?.at(-1)?.url?.split("/")?.filter(Boolean)
          : page?.slug?.split("/")) ?? [];

      if (isHomeSlug(slug)) {continue;}

      results.push({
        locale,
        slug,
      });
    }
  }

  return results;
}
