/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/lib/dal/getTalks.ts   (re-export both from lib/dal/index.ts)
 *
 * Reads for the Talk collection. Modelled on getPosts.ts, including its unstable_cache +
 * react cache pairing, so a page rendering three TalkGrid blocks issues one query per distinct
 * argument set rather than three.
 *
 * `select` matters here beyond tidiness: a Talk carries transcriptSegments, which is ~113 rows for
 * a 7-minute talk and would be roughly 8,000 for an hour. A listing that selected it would drag
 * megabytes per row out of the database to render a title and a lock icon.
 */

import { unstable_cache } from "next/cache";
import type { Payload, Where } from "payload";
import { cache } from "react";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";

export interface GetTalksOptions {
  limit?: number;
  locale?: Locale;
  kind?: string;
  topicSlug?: string;
  ids?: (number | string)[];
}

const LISTING_SELECT = {
  audioUrl: true,
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
  ids: (number | string)[] | undefined
) {
  const where: Where = { _status: { equals: "published" } };
  if (kind) where.kind = { equals: kind };
  if (topicSlug) where["topics.slug"] = { equals: topicSlug };
  if (ids?.length) where.id = { in: ids };

  return payload.find({
    collection: "talk",
    depth: 1,
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
    unstable_cache(
      () => getTalksQuery(payload, limit, locale, kind, topicSlug, ids),
      [limit.toString(), locale, kind ?? "", topicSlug ?? "", (ids ?? []).join(",")],
      { tags: ["talks"] }
    )()
);

export const getTalks = async (payload: Payload, options: GetTalksOptions = {}) => {
  const { limit = 6, locale, kind, topicSlug, ids } = options;
  return getTalksCached(payload, limit, await resolveLocale(locale), kind, topicSlug, ids);
};

/**
 * Full document for the talk page, transcript and all. Deliberately NOT tier-filtered: the caller
 * applies applyTier() so that the SEO metadata and the teaser can be built from the complete
 * document even when the body is withheld from the reader.
 */
export const getTalkBySlug = async (payload: Payload, slug: string, locale?: Locale) => {
  const result = await payload.find({
    collection: "talk",
    depth: 2,
    limit: 1,
    locale: await resolveLocale(locale),
    overrideAccess: true,
    where: { slug: { equals: slug } },
  });
  return result.docs[0] ?? null;
};
