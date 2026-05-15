"use server";

import type { Payload } from "payload";

import type { Locale } from "@/core/types";
import { buildUrl } from "@/core/utils/path/buildUrl";
import type { Page, Post } from "@/payload-types";

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
  if (collection === "page") {
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
          collection: "page",
          slug: doc.slug,
          breadcrumbs: doc.breadcrumbs,
          locale,
          absolute: false,
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

    const {heroImage} = doc;
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
        collection: "posts",
        slug: doc.slug,
        locale,
        absolute: false,
      }),
    };
  }

  return null;
}
