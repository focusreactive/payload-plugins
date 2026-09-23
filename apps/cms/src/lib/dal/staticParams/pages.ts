import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";

import { getPathMap } from "../pathMap";

export type PageStaticParams = { locale: string; slug: string[] }[];

function isHomeSlug(slug: string[]): boolean {
  if (slug.length === 0) {
    return true;
  }
  if (slug.length === 1 && (slug[0] === "home" || slug[0] === "")) {
    return true;
  }
  return false;
}

export async function getMainSitePageStaticParams(): Promise<PageStaticParams> {
  const pathMap = await getPathMap();

  const results: PageStaticParams = [];

  for (const localeConfig of I18N_CONFIG.locales) {
    const locale = localeConfig.code as Locale;

    for (const path of Object.keys(pathMap.pathToId[locale] ?? {})) {
      const slug = path.split("/").filter(Boolean);

      if (isHomeSlug(slug)) {
        continue;
      }

      results.push({
        locale,
        slug,
      });
    }
  }

  return results;
}
