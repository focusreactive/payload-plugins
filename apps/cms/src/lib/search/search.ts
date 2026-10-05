"use server";

import { getPayloadClient } from "@/dal";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Media, Page, Post } from "@/payload-types";

import type { SearchResultGroup, SearchResultItem } from "./types";

type Response =
  | {
      success: true;
      data: SearchResultGroup[];
    }
  | {
      success: false;
      error: string;
    };

interface Params {
  query: string;
  locale: string;
}

const LIMIT_PER_COLLECTION = 10;

function isLocale(locale: string): locale is Locale {
  return I18N_CONFIG.locales.some(({ code }) => code === locale);
}

function imageOf(media: number | Media | null | undefined) {
  return media && typeof media !== "number"
    ? { imageAlt: media.alt ?? null, imageUrl: media.url ?? null }
    : { imageAlt: null, imageUrl: null };
}

function pageItem(doc: Page, locale: Locale): SearchResultItem {
  const hero = doc.blocks?.find((block) => block.blockType === "hero");
  return {
    ...imageOf(hero?.blockType === "hero" ? hero.image?.image : null),
    collection: "page",
    documentId: String(doc.id),
    slug: doc.slug,
    title: doc.title,
    url:
      buildUrl({
        absolute: false,
        breadcrumbs: doc.breadcrumbs,
        collection: "page",
        locale,
        slug: doc.slug,
      }) || "/",
  };
}

function postItem(doc: Post, locale: Locale): SearchResultItem {
  return {
    ...imageOf(doc.heroImage),
    collection: "post",
    documentId: String(doc.id),
    slug: doc.slug,
    title: doc.title,
    url: buildUrl({ absolute: false, collection: "posts", locale, slug: doc.slug }),
  };
}

export async function search({ query, locale }: Params): Promise<Response> {
  if (!isLocale(locale)) {
    return { data: [], success: true };
  }

  try {
    const payload = await getPayloadClient();
    const published = { _status: { equals: "published" } } as const;
    const [pages, posts] = await Promise.all([
      payload.find({
        collection: "page",
        depth: 1,
        limit: LIMIT_PER_COLLECTION,
        locale,
        pagination: false,
        where: { and: [published, { title: { like: query } }] },
      }),
      payload.find({
        collection: "posts",
        depth: 1,
        limit: LIMIT_PER_COLLECTION,
        locale,
        pagination: false,
        sort: "-publishedAt",
        where: {
          and: [published, { or: [{ title: { like: query } }, { excerpt: { like: query } }] }],
        },
      }),
    ]);

    const groups: SearchResultGroup[] = [
      { collection: "page", items: pages.docs.map((doc) => pageItem(doc, locale)) },
      { collection: "post", items: posts.docs.map((doc) => postItem(doc, locale)) },
    ];

    return { data: groups.filter((group) => group.items.length > 0), success: true };
  } catch (error) {
    console.error("[search] error:", error);
    return { error: String(error), success: false };
  }
}
