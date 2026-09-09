/**
 * Slug lookup for the Topic collection, so a topic can render from a route instead of needing a
 * Page document per topic. Modelled on getTalkBySlug in ./getTalks.ts for its signature and on
 * getPostBySlug.ts for its caching, which is the by-slug convention here: react `cache` collapses
 * the repeat call that generateMetadata + the page component always make within one request, and
 * `unstable_cache` keeps the query out of the database across requests.
 *
 * No draft branch and no `_status` filter, unlike getPostBySlug: the Topic collection declares no
 * `versions`, so there are no drafts to serve and no status column to filter on. Asking for one
 * would fail the query rather than return nothing.
 */

import { unstable_cache } from "next/cache";
import type { Payload } from "payload";
import { cache } from "react";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";
import type { Topic } from "@/payload-types";

async function getTopicBySlugQuery(
  payload: Payload,
  slug: string,
  resolvedLocale: Locale
): Promise<Topic | null> {
  const result = await payload.find({
    collection: "topic",
    // A topic's only relationship is meta.image, so depth 1 populates everything a renderer can
    // reach. getTalkBySlug needs 2 because a talk's topics are themselves relationships.
    depth: 1,
    limit: 1,
    locale: resolvedLocale,
    // Read is `anyone` on this collection anyway; overrideAccess keeps the route independent of
    // whoever happens to be logged into the admin in another tab.
    overrideAccess: true,
    where: { slug: { equals: slug } },
  });

  return (result.docs[0] as Topic) ?? null;
}

const getTopicBySlugCached = cache(async (payload: Payload, slug: string, resolvedLocale: Locale) =>
  unstable_cache(
    () => getTopicBySlugQuery(payload, slug, resolvedLocale),
    [slug, resolvedLocale],
    // A literal tag rather than cacheTag(), whose params union covers page, post and redirect
    // only. getTalks.ts tags "talks" the same way, so revalidation stays one shape per
    // collection.
    { tags: ["topics"] }
  )()
);

export const getTopicBySlug = async (
  payload: Payload,
  slug: string,
  locale?: Locale
): Promise<Topic | null> => getTopicBySlugCached(payload, slug, await resolveLocale(locale));
