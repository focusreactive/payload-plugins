import type { Metadata } from "next";

import { I18N_CONFIG } from "@/core/config/i18n";
import { getAlternateLocales } from "@/dal/getAlternateLocales";
import { getSiteSettings } from "@/dal/getSiteSettings";
import type { Media, Page, Post } from "@/payload-types";

import type { Locale } from "../types";
import { buildUrl } from "../utils/path/buildUrl";
import { buildPageTitle } from "./buildPageTitle";
import { getServerSideURL } from "./getURL";
import { mergeOpenGraph } from "./mergeOpenGraph";

function getOpenGraphLocale(locale: Locale): string {
  return (
    I18N_CONFIG.openGraphLocales[
      locale as keyof typeof I18N_CONFIG.openGraphLocales
    ] || I18N_CONFIG.openGraphLocales.en
  );
}

const getImageURL = (image: Media | null | undefined) => {
  let url = null;
  const serverUrl = getServerSideURL();

  if (image && typeof image === "object" && "url" in image) {
    const ogUrl = image.sizes?.og?.url;

    url = ogUrl ? serverUrl + ogUrl : serverUrl + image.url;
  }

  return url;
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

  const siteName = settings?.siteName || "Site";
  const separator = settings?.seoTitleSeparator || "|";
  const suffix = settings?.seoTitleSuffix || siteName;
  const ogSiteName = settings?.ogSiteName || siteName;

  const baseTitle =
    doc?.meta?.title || doc?.title || settings?.defaultOgTitle || siteName;

  const title = buildPageTitle(baseTitle, separator, suffix, siteName);

  const description =
    doc?.meta?.description ||
    settings?.defaultDescription ||
    settings?.defaultOgDescription ||
    "";

  const ogDescription =
    doc?.meta?.description ||
    settings?.defaultOgDescription ||
    settings?.defaultDescription ||
    "";

  const ogImage = getImageURL(
    (doc?.meta?.image || settings?.defaultOgImage) as Parameters<
      typeof getImageURL
    >[0]
  );

  const ogTitle =
    doc?.meta?.title || doc?.title || settings?.defaultOgTitle || siteName;

  let canonical: string;
  if (collection === "posts") {
    canonical = buildUrl({
      collection: "posts",
      locale,
      slug: doc?.slug || null,
    });
  } else {
    canonical = buildUrl({
      breadcrumbs: (doc as Page)?.breadcrumbs,
      collection: "page",
      locale,
      slug: doc?.slug || null,
    });
  }

  const twitterCard = settings?.defaultTwitterCard || "summary_large_image";
  const twitterSite = settings?.twitterSite;
  const twitterCreator = settings?.twitterCreator;

  const shouldIndex = doc?.meta?.robots === "index";

  let languages: Record<string, string> | undefined;

  if (collection === "posts") {
    if (page !== undefined) {
      languages = await getAlternateLocales({
        collection: "posts",
        currentLocale: locale,
        page,
      });
    } else if (doc?.slug) {
      languages = await getAlternateLocales({
        collection: "posts",
        currentLocale: locale,
        slug: doc.slug,
      });
    }
  } else if (collection === "page") {
    languages = await getAlternateLocales({
      breadcrumbs: (doc as Page)?.breadcrumbs,
      collection: "page",
      currentLocale: locale,
      slug: doc?.slug || undefined,
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

  return {
    alternates: {
      canonical,
      languages,
      ...overridesAlternates,
    },
    description,
    openGraph: mergeOpenGraph({
      title: ogTitle,
      description: ogDescription,
      siteName: ogSiteName,
      type: "website",
      locale: getOpenGraphLocale(locale),
      alternateLocale: alternateLocalesForOG,
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
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
