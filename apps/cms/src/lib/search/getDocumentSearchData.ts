"use server";

import type { Payload } from "payload";

import type { Locale } from "@/lib/types";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Page, Post, Talk, Topic } from "@/payload-types";

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

  if (collection === "talk") {
    let doc: Talk;

    try {
      doc = await payload.findByID({
        collection: "talk",
        depth: 1,
        id: documentId,
        locale: locale as Locale,
      });
    } catch {
      return null;
    }

    // A third image shape, not a reuse of either of the two above: a talk's cover is a group with
    // an upload inside it, where a post's heroImage is the upload itself and a page's comes out of
    // a hero block.
    const image = doc.coverImage?.image;
    const hasImage = image && typeof image !== "number";

    return {
      imageAlt: hasImage ? image.alt : null,
      imageUrl: hasImage ? (image.url ?? null) : null,
      slug: doc.slug,
      title: doc.title,
      url: buildUrl({ absolute: false, collection: "talk", locale, slug: doc.slug }),
    };
  }

  if (collection === "topic") {
    let doc: Topic;

    try {
      doc = await payload.findByID({
        collection: "topic",
        depth: 1,
        id: documentId,
        locale: locale as Locale,
      });
    } catch {
      return null;
    }

    // A topic carries no image of its own - it is a vocabulary term with a description. The
    // results list renders its own placeholder rather than inventing one here.
    return {
      imageAlt: null,
      imageUrl: null,
      slug: doc.slug,
      title: doc.title,
      url: buildUrl({ absolute: false, collection: "topic", locale, slug: doc.slug }),
    };
  }

  return null;
}
