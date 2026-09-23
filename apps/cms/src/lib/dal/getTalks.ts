/**
 * Reads for the Talk collection. Modelled on getPosts.ts, including its scopedCache +
 * react cache pairing, so a page rendering three TalkGrid blocks issues one query per distinct
 * argument set rather than three.
 *
 * `select` matters here beyond tidiness: a Talk carries transcriptSegments, which is ~113 rows for
 * a 7-minute talk and would be roughly 8,000 for an hour. A listing that selected it would drag
 * megabytes per row out of the database to render a title and a lock icon.
 */

import { draftMode } from "next/headers";
import type { Payload, Where } from "payload";
import { cache } from "react";

import { scopedCache } from "@/lib/utils/scopedCache";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";

export interface GetTalksOptions {
  limit?: number;
  locale?: Locale;
  kind?: string;
  topicSlug?: string;
  ids?: (number | string)[];
}

/*
 * A field missing here is invisible rather than broken: the document comes back without it and a
 * card silently renders its empty state, whatever an editor set in the admin. `coverImage` is the
 * one that costs the most, because it is the card's whole top half.
 */
const LISTING_SELECT = {
  audioUrl: true,
  coverImage: true,
  durationSeconds: true,
  kind: true,
  publishedAt: true,
  requiredTier: true,
  slug: true,
  teaser: true,
  title: true,
  topics: true,
} as const;

async function getTalksQuery(
  payload: Payload,
  limit: number,
  locale: Locale,
  kind: string | undefined,
  topicSlug: string | undefined,
  ids: (number | string)[] | undefined,
  draft: boolean
) {
  // A draft preview has to see unpublished work, and the published filter would hide exactly the
  // document the editor is looking at.
  const where: Where = draft ? {} : { _status: { equals: "published" } };
  if (kind) where.kind = { equals: kind };
  if (topicSlug) where["topics.slug"] = { equals: topicSlug };
  if (ids?.length) where.id = { in: ids };

  return payload.find({
    collection: "talk",
    depth: 1,
    // `draft` is not only about which version is returned. The visual-editing plugin gates its
    // whole enrichment pass on it (`shouldEnrich` reads the draft flag off the request context),
    // so a query without it returns values carrying no edit paths and the preview has nothing to
    // click. That is why this is threaded through rather than left to the caller.
    draft,
    limit,
    locale,
    // Read is `anyone` on this collection anyway; overrideAccess keeps the listing independent of
    // whoever happens to be logged into the admin in another tab.
    overrideAccess: true,
    select: LISTING_SELECT,
    sort: "-publishedAt",
    where,
  });
}

const getTalksCached = cache(
  async (
    payload: Payload,
    limit: number,
    locale: Locale,
    kind: string | undefined,
    topicSlug: string | undefined,
    ids: (number | string)[] | undefined
  ) =>
    scopedCache(
      () => getTalksQuery(payload, limit, locale, kind, topicSlug, ids, false),
      [limit.toString(), locale, kind ?? "", topicSlug ?? "", (ids ?? []).join(",")],
      { tags: ["talks"] }
    )()
);

export const getTalks = async (payload: Payload, options: GetTalksOptions = {}) => {
  const { limit = 6, locale, kind, topicSlug, ids } = options;
  const resolvedLocale = await resolveLocale(locale);
  const { isEnabled: draft } = await draftMode();

  // Draft reads go straight to the database, exactly as getPageBySlug does. Caching them would
  // serve one editor's unpublished work to the next request, and would let a draft overwrite the
  // published entry under the same cache key.
  if (draft) {
    return getTalksQuery(payload, limit, resolvedLocale, kind, topicSlug, ids, true);
  }

  return getTalksCached(payload, limit, resolvedLocale, kind, topicSlug, ids);
};

/**
 * Full document for the talk page, transcript and all. Deliberately NOT tier-filtered: the caller
 * applies applyTier() so that the SEO metadata and the teaser can be built from the complete
 * document even when the body is withheld from the reader.
 */
export const getTalkBySlug = async (payload: Payload, slug: string, locale?: Locale) => {
  const { isEnabled: draft } = await draftMode();

  const result = await payload.find({
    collection: "talk",
    depth: 2,
    // Without this the visual-editing plugin never enriches the document, so click-to-edit does
    // nothing on a talk while it works on every Page - the plugin is enabled for this collection,
    // it just never sees a draft request to act on.
    draft,
    limit: 1,
    locale: await resolveLocale(locale),
    overrideAccess: true,
    where: { slug: { equals: slug } },
  });
  return result.docs[0] ?? null;
};
