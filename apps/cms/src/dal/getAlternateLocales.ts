import { BLOG_CONFIG } from "@/core/config/blog";
import { I18N_CONFIG } from "@/core/config/i18n";
import type { Locale } from "@/core/types";
import { buildUrl } from "@/core/utils/path/buildUrl";
import { getPayloadClient } from "@/dal/payload-client";
import type { Page } from "@/payload-types";

type GetAlternateLocalesOptions =
  | {
      collection: "page";
      breadcrumbs?: Page["breadcrumbs"];
      slug?: string;
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
    let pathSegments: string[] = [];

    if (options.breadcrumbs && options.breadcrumbs.length > 0) {
      const lastBreadcrumb =
        options.breadcrumbs.at(-1);
      if (lastBreadcrumb?.url) {
        pathSegments = lastBreadcrumb.url
          .replace(/^\//, "")
          .split("/")
          .filter(Boolean);
      }
    } else if (options.slug) {
      pathSegments = options.slug.split("/").filter(Boolean);
    }

    if (pathSegments.length === 0) {
      pathSegments = ["home"];
    }

    const fullPath = pathSegments.join("/");

    for (const locale of locales) {
      const result = await payload.find({
        collection: "page",
        limit: 1,
        locale,
        overrideAccess: false,
        pagination: false,
        select: {
          breadcrumbs: true,
        },
        where: {
          _status: {
            equals: "published",
          },
          "breadcrumbs.url": {
            equals: `/${fullPath}`,
          },
        },
      });

      if (result.docs.length > 0) {
        const url = buildUrl({
          breadcrumbs: result.docs[0].breadcrumbs,
          collection: "page",
          locale,
        });
        languages[locale] = url;
      }
    }

    if (languages[I18N_CONFIG.defaultLocale as Locale]) {
      languages["x-default"] = languages[I18N_CONFIG.defaultLocale as Locale];
    }

    return languages;
  }

  return languages;
}
