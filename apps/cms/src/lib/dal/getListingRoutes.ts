import { cache } from "react";

import type { Insight, Person } from "@/payload-types";

import { getPayloadClient } from "./payload-client";

type SiteLocale = "en" | "fr" | "ja";
const SITE_LOCALES: SiteLocale[] = ["en", "fr", "ja"];

/**
 * Articles and people have no page documents of their own. Their addresses hang off the listing
 * page that shows them, in each language: /insights/<article> in English, /fr/actualites/<article>
 * in French. The listing pages are found by their English slug, which the seed fixes.
 */
const getListingPathsBySlug = cache(async (englishSlug: string) => {
  const payload = await getPayloadClient();
  const found = await payload.find({
    collection: "page",
    locale: "en",
    where: { slug: { equals: englishSlug } },
    limit: 1,
    depth: 0,
  });
  const pageId = found.docs[0]?.id;
  const paths: Partial<Record<SiteLocale, string>> = {};
  if (!pageId) return paths;
  for (const locale of SITE_LOCALES) {
    const localized = await payload.findByID({
      collection: "page",
      id: pageId,
      locale,
      fallbackLocale: false,
      depth: 0,
    });
    const url = localized.breadcrumbs?.at(-1)?.url;
    if (url) paths[locale] = url;
  }
  return paths;
});

export function personSlug(person: Pick<Person, "name">) {
  return person.name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function withLocalePrefix(locale: string, path: string) {
  return locale === "en" ? path : `/${locale}${path}`;
}

export async function getInsightHref(insight: Pick<Insight, "slug">, locale: string) {
  const paths = await getListingPathsBySlug("insights");
  const base = paths[locale as SiteLocale];
  return base && insight.slug ? withLocalePrefix(locale, `${base}/${insight.slug}`) : null;
}

export async function getPersonHref(person: Pick<Person, "name">, locale: string) {
  const paths = await getListingPathsBySlug("our-people");
  const base = paths[locale as SiteLocale];
  return base ? withLocalePrefix(locale, `${base}/${personSlug(person)}`) : null;
}

export type ListingDetail =
  | { kind: "insight"; insight: Insight; alternates: Record<string, string> }
  | { kind: "person"; person: Person; alternates: Record<string, string> };

/**
 * Called only after no page matched the address, so a real page always wins over a detail route.
 */
export async function resolveListingDetail(
  segments: string[],
  locale: string
): Promise<ListingDetail | null> {
  if (segments.length < 2) return null;
  const parentPath = `/${segments.slice(0, -1).join("/")}`;
  const lastSegment = segments[segments.length - 1];
  const payload = await getPayloadClient();

  const insightPaths = await getListingPathsBySlug("insights");
  if (insightPaths[locale as SiteLocale] === parentPath) {
    const found = await payload.find({
      collection: "insight",
      locale: locale as "en",
      fallbackLocale: false,
      where: { slug: { equals: lastSegment } },
      limit: 1,
      depth: 1,
    });
    const insight = found.docs[0];
    if (!insight?.title) return null;
    const alternates: Record<string, string> = {};
    for (const otherLocale of SITE_LOCALES) {
      const localized = await payload.findByID({
        collection: "insight",
        id: insight.id,
        locale: otherLocale,
        fallbackLocale: false,
        depth: 0,
      });
      if (!localized.title) continue;
      const href = await getInsightHref(localized, otherLocale);
      if (href) alternates[otherLocale] = href;
    }
    return { kind: "insight", insight, alternates };
  }

  const peoplePaths = await getListingPathsBySlug("our-people");
  if (peoplePaths[locale as SiteLocale] === parentPath) {
    const people = await payload.find({
      collection: "person",
      where: { _status: { equals: "published" } },
      limit: 200,
      depth: 0,
    });
    const person = people.docs.find((candidate) => personSlug(candidate) === lastSegment);
    if (!person) return null;
    const alternates: Record<string, string> = {};
    for (const otherLocale of SITE_LOCALES) {
      const href = await getPersonHref(person, otherLocale);
      if (href) alternates[otherLocale] = href;
    }
    return { kind: "person", person, alternates };
  }

  return null;
}

/**
 * Every article and profile address, in every language it exists in, for generateStaticParams.
 */
export async function getListingDetailStaticParams(): Promise<
  { locale: string; slug: string[] }[]
> {
  const payload = await getPayloadClient();
  const params: { locale: string; slug: string[] }[] = [];
  const [insightPaths, peoplePaths] = await Promise.all([
    getListingPathsBySlug("insights"),
    getListingPathsBySlug("our-people"),
  ]);
  const people = await payload.find({
    collection: "person",
    where: { _status: { equals: "published" } },
    limit: 200,
    depth: 0,
  });
  for (const locale of SITE_LOCALES) {
    const insightBase = insightPaths[locale];
    if (insightBase) {
      const insights = await payload.find({
        collection: "insight",
        locale,
        fallbackLocale: false,
        limit: 500,
        depth: 0,
      });
      for (const insight of insights.docs) {
        if (insight.title && insight.slug) {
          params.push({ locale, slug: [...insightBase.split("/").filter(Boolean), insight.slug] });
        }
      }
    }
    const peopleBase = peoplePaths[locale];
    if (peopleBase) {
      for (const person of people.docs) {
        params.push({
          locale,
          slug: [...peopleBase.split("/").filter(Boolean), personSlug(person)],
        });
      }
    }
  }
  return params;
}
