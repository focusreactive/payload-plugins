"use server";

import type { Payload } from "payload";

import { getInsightHref, getPersonHref, personSlug } from "@/lib/dal/getListingRoutes";
import type { Locale } from "@/lib/types";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Insight, Page, Person, Post } from "@/payload-types";

import type { SearchCollection } from "./types";

interface DisplayData {
  title: string;
  slug: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
}

export async function getDocumentSearchData(
  payload: Payload,
  documentId: string,
  collection: SearchCollection,
  locale: string
): Promise<DisplayData | null> {
  if (collection === "page" || collection === "service") {
    let doc: Page;

    try {
      doc = await payload.findByID({
        collection: "page",
        depth: 1,
        id: documentId,
        locale: locale as Locale,
      });
    } catch {
      return null;
    }

    const hero = doc.blocks?.find((b) => b.blockType === "hero");
    let imageUrl: string | null = null;
    let imageAlt: string | null = null;

    if (hero && hero.blockType === "hero") {
      const image = hero.image?.image;

      if (image && typeof image !== "number") {
        imageUrl = image.url ?? null;
        imageAlt = image.alt;
      }
    }

    return {
      imageAlt,
      imageUrl,
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

  if (collection === "post") {
    let doc: Post;

    try {
      doc = await payload.findByID({
        collection: "posts",
        depth: 1,
        id: documentId,
        locale: locale as Locale,
      });
    } catch {
      return null;
    }

    const { heroImage } = doc;
    let imageUrl: string | null = null;
    let imageAlt: string | null = null;

    if (heroImage && typeof heroImage !== "number") {
      imageUrl = heroImage.url ?? null;
      imageAlt = heroImage.alt;
    }

    return {
      imageAlt,
      imageUrl,
      slug: doc.slug,
      title: doc.title,
      url: buildUrl({
        absolute: false,
        collection: "posts",
        locale,
        slug: doc.slug,
      }),
    };
  }

  if (collection === "insight") {
    let doc: Insight;

    try {
      doc = await payload.findByID({
        collection: "insight",
        depth: 0,
        id: documentId,
        locale: locale as Locale,
      });
    } catch {
      return null;
    }

    // Insights have no image field of their own (Insight/index.ts), so there is nothing to
    // resolve here - unlike page and post, this is always null rather than a lookup that failed.
    return {
      imageAlt: null,
      imageUrl: null,
      slug: doc.slug ?? "",
      title: doc.title,
      url: (await getInsightHref(doc, locale)) ?? "/",
    };
  }

  if (collection === "person") {
    let doc: Person;

    try {
      doc = await payload.findByID({
        collection: "person",
        depth: 1,
        id: documentId,
        // Person carries no localized fields (Person/index.ts), so every locale reads the same
        // row - fetched in the requested locale anyway to keep the findByID call shape uniform.
        locale: locale as Locale,
      });
    } catch {
      return null;
    }

    const { photo } = doc;
    const imageUrl = photo && typeof photo !== "number" ? (photo.url ?? null) : null;
    const imageAlt = photo && typeof photo !== "number" ? photo.alt : null;

    return {
      imageAlt,
      imageUrl,
      slug: personSlug(doc),
      title: doc.name,
      url: (await getPersonHref(doc, locale)) ?? "/",
    };
  }

  return null;
}
