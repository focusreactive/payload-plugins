import type { Metadata } from "next";

import { I18N_CONFIG } from "@/lib/config/i18n";
import { getAlternateLocales } from "@/dal/getAlternateLocales";
import { getSiteSettings } from "@/dal/getSiteSettings";
import type { Media, News, Page, Post, Vacancy } from "@/payload-types";

import type { Locale } from "../types";
import { buildUrl } from "../utils/path/buildUrl";
import { buildPageTitle } from "./buildPageTitle";
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

export const generateMeta = async (args: {
  doc: Partial<Page | Post | Vacancy | News> | null;
  overrides?: Partial<Metadata>;
  locale: Locale;
  collection: "page" | "posts" | "vacancies" | "news" | "authors" | "tags";
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

  const siteName = settings?.general?.siteName || "Site";
  const separator = settings?.seo?.titleSeparator || "|";
  const suffix = settings?.seo?.titleSuffix || siteName;
  const ogSiteName = settings?.seo?.og?.siteName || siteName;

  const baseTitle = doc?.meta?.title || doc?.title || settings?.seo?.og?.title || siteName;

  const title = buildPageTitle(baseTitle, separator, suffix, siteName);

  const description =
    doc?.meta?.description ||
    settings?.seo?.defaultDescription ||
    settings?.seo?.og?.description ||
    "";

  const ogDescription =
    doc?.meta?.description ||
    settings?.seo?.og?.description ||
    settings?.seo?.defaultDescription ||
    "";

  const ogImage = getImageURL(
    (doc?.meta?.image || settings?.seo?.og?.image) as Parameters<typeof getImageURL>[0]
  );

  const ogTitle = doc?.meta?.title || doc?.title || settings?.seo?.og?.title || siteName;

  let canonical: string;
  if (collection !== "page") {
    canonical = buildUrl({
      collection,
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

  const twitterCard = settings?.seo?.x?.card || "summary_large_image";
  const twitterSite = settings?.seo?.x?.site;
  const twitterCreator = settings?.seo?.x?.creator;

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
  } else if ((collection === "vacancies" || collection === "news") && doc?.slug) {
    languages = await getAlternateLocales({
      collection,
      currentLocale: locale,
      slug: doc.slug,
    });
  } else if ((collection === "authors" || collection === "tags") && doc?.slug) {
    const slug = doc.slug;
    languages = Object.fromEntries(
      I18N_CONFIG.locales.map(({ code }) => [code, buildUrl({ collection, locale: code, slug })])
    );
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
