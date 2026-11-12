import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import type { Metadata } from "next";

import { I18N_CONFIG } from "@/lib/config/i18n";
import { getAlternateLocales } from "@/dal/getAlternateLocales";
import { getSiteSettings } from "@/dal/getSiteSettings";
import type { Media, Page, Post } from "@/payload-types";

import type { Locale } from "../types";
import { buildUrl } from "../utils/path/buildUrl";
import { buildPageTitle, titlePartsOf } from "./buildPageTitle";
import { getAbsoluteMediaUrl } from "./getMediaUrl";
import { mergeOpenGraph } from "./mergeOpenGraph";

function getOpenGraphLocale(locale: Locale): string {
  return (
    I18N_CONFIG.openGraphLocales[locale as keyof typeof I18N_CONFIG.openGraphLocales] ||
    I18N_CONFIG.openGraphLocales.en
  );
}

const getImageURL = (image: Media | null | undefined) => {
  if (!image || typeof image !== "object" || !("url" in image)) {
    return null;
  }

  const ogUrl = image.sizes?.og?.url ?? image.url;
  return getAbsoluteMediaUrl(ogUrl, image.filesize) || null;
};

const pathBreadcrumbsOf = (breadcrumbs: Page["breadcrumbs"]): Page["breadcrumbs"] => {
  const last = breadcrumbs?.at(-1);
  return last ? [{ url: stripMarkers(last.url) }] : breadcrumbs;
};

export const generateMeta = async (args: {
  doc: Partial<Page | Post> | null;
  overrides?: Partial<Metadata>;
  locale: Locale;
  collection: "page" | "posts";
  page?: number;
}): Promise<Metadata> => {
  const { doc, overrides, locale, collection, page } = args;

  const {
    openGraph: overridesOpenGraph = {},
    twitter: overridesTwitter = {},
    alternates: overridesAlternates = {},
    ...overridesRest
  } = overrides || {};

  const settings = await getSiteSettings({ locale });

  const titleParts = titlePartsOf(settings);
  const { siteName } = titleParts;
  const ogSiteName = stripMarkers(settings?.seo?.og?.siteName) || siteName;
  const defaultDescription = stripMarkers(settings?.seo?.defaultDescription);
  const settingsOgDescription = stripMarkers(settings?.seo?.og?.description);
  const metaDescription = stripMarkers(doc?.meta?.description);
  const slug = doc?.slug;
  const breadcrumbs = pathBreadcrumbsOf((doc as Page)?.breadcrumbs);

  const baseTitle =
    stripMarkers(doc?.meta?.title || doc?.title || settings?.seo?.og?.title) || siteName;

  const title = buildPageTitle(baseTitle, titleParts);

  const description = metaDescription || defaultDescription || settingsOgDescription || "";

  const ogDescription = metaDescription || settingsOgDescription || defaultDescription || "";

  const ogImage = getImageURL(
    (doc?.meta?.image || settings?.seo?.og?.image) as Parameters<typeof getImageURL>[0]
  );

  const ogTitle = baseTitle;

  let canonical: string;
  if (collection === "posts") {
    canonical = buildUrl({
      collection: "posts",
      locale,
      slug: slug || null,
    });
  } else {
    canonical = buildUrl({
      breadcrumbs,
      collection: "page",
      locale,
      slug: slug || null,
    });
  }

  const twitterCard = settings?.seo?.x?.card || "summary_large_image";
  const twitterSite = stripMarkers(settings?.seo?.x?.site);
  const twitterCreator = stripMarkers(settings?.seo?.x?.creator);

  const shouldIndex = doc?.meta?.robots === "index";

  let languages: Record<string, string> | undefined;

  if (collection === "posts") {
    if (page !== undefined) {
      languages = await getAlternateLocales({
        collection: "posts",
        currentLocale: locale,
        page,
      });
    } else if (slug) {
      languages = await getAlternateLocales({
        collection: "posts",
        currentLocale: locale,
        slug,
      });
    }
  } else if (collection === "page") {
    languages = await getAlternateLocales({
      breadcrumbs,
      collection: "page",
      currentLocale: locale,
      slug: slug || undefined,
    });
  }

  const alternateLocalesForOG: string[] = [];
  if (languages) {
    for (const [lang] of Object.entries(languages)) {
      if (lang !== "x-default" && lang !== locale) {
        alternateLocalesForOG.push(getOpenGraphLocale(lang as Locale));
      }
    }
  }

  const isArticle = collection === "posts";
  const publishedTime = isArticle
    ? ((doc as Partial<Post> | null)?.publishedAt ?? undefined)
    : undefined;

  return {
    alternates: {
      canonical,
      languages,
      ...overridesAlternates,
    },
    description,
    openGraph: mergeOpenGraph({
      alternateLocale: alternateLocalesForOG,
      description: ogDescription,
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      locale: getOpenGraphLocale(locale),
      siteName: ogSiteName,
      title: ogTitle,
      ...(isArticle
        ? { type: "article", ...(publishedTime ? { publishedTime } : {}) }
        : { type: "website" }),
      url: canonical,
      ...overridesOpenGraph,
    }),
    robots: {
      follow: true,
      googleBot: {
        follow: true,
        index: shouldIndex,
      },
      index: shouldIndex,
    },
    title,
    twitter: {
      card: twitterCard,
      creator: twitterCreator || undefined,
      description: ogDescription,
      images: ogImage ? [ogImage] : undefined,
      site: twitterSite || undefined,
      title: ogTitle,
      ...overridesTwitter,
    },
    ...overridesRest,
  };
};
