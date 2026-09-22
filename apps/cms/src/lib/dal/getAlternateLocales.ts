import { BLOG_CONFIG } from "@/lib/config/blog";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import { getPayloadClient } from "@/dal/payload-client";
import type { Page } from "@/payload-types";

import { getPathMap } from "./pathMap";

type GetAlternateLocalesOptions =
  | {
      collection: "page";
      /** The id of the page being viewed - looked up in the path map directly, so the caller never has to resolve a path per locale itself. */
      id: number;
      currentLocale: Locale;
    }
  | {
      collection: "posts";
      slug?: string;
      currentLocale: Locale;
      page?: number;
    };

export async function getAlternateLocales(
  options: GetAlternateLocalesOptions
): Promise<Record<string, string>> {
  const payload = await getPayloadClient();
  const locales = I18N_CONFIG.locales.map((l) => l.code as Locale);
  const languages: Partial<Record<Locale | "x-default", string>> = {};

  if (options.collection === "posts") {
    if (options.page !== undefined && !options.slug) {
      for (const locale of locales) {
        const url = buildUrl({
          collection: "posts",
          locale,
          page: options.page > 1 ? options.page : undefined,
        });
        languages[locale] = url;
      }
      languages["x-default"] = buildUrl({
        collection: "posts",
        locale: I18N_CONFIG.defaultLocale as Locale,
        page: options.page > 1 ? options.page : undefined,
      });
      return languages;
    }

    if (options.slug) {
      for (const locale of locales) {
        const result = await payload.find({
          collection: BLOG_CONFIG.collection,
          limit: 1,
          locale,
          overrideAccess: false,
          pagination: false,
          select: {
            slug: true,
          },
          where: {
            _status: {
              equals: "published",
            },
            slug: {
              equals: options.slug,
            },
          },
        });

        if (result.docs.length > 0) {
          const url = buildUrl({
            collection: "posts",
            locale,
            slug: options.slug,
          });
          languages[locale] = url;
        }
      }

      if (languages[I18N_CONFIG.defaultLocale as Locale]) {
        languages["x-default"] = languages[I18N_CONFIG.defaultLocale as Locale];
      }
    }

    return languages;
  }

  if (options.collection === "page") {
    // Same document, same id, in every locale - the id never changes on a
    // rename, so this is exactly the lookup the map exists for. One cached
    // read replaces what used to be one `payload.find` per locale.
    const pathMap = await getPathMap();
    const pathsByLocale = pathMap.idToPath[options.id] ?? {};

    for (const locale of locales) {
      const path = pathsByLocale[locale];
      if (path) {
        languages[locale] = buildUrl({ collection: "page", locale, path });
      }
    }

    if (languages[I18N_CONFIG.defaultLocale as Locale]) {
      languages["x-default"] = languages[I18N_CONFIG.defaultLocale as Locale];
    }

    return languages;
  }

  return languages;
}
