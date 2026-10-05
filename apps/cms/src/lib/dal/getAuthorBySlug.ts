import { cache } from "react";

import { cacheTag } from "@/lib/utils/cacheTags";
import { scopedCache } from "@/lib/utils/scopedCache";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";
import { getPayloadClient } from "@/dal/payload-client";
import type { Author } from "@/payload-types";

async function query(slug: string, locale: Locale): Promise<Author | null> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "authors",
    depth: 1,
    limit: 1,
    locale,
    overrideAccess: false,
    pagination: false,
    where: { slug: { equals: slug } },
  });
  return result.docs[0] ?? null;
}

/** Author for /author/<slug> (public: name, avatar, bio). */
export const getAuthorBySlug = cache(
  async ({ slug, locale }: { slug: string; locale?: Locale }) => {
    const resolvedLocale = await resolveLocale(locale);
    return scopedCache(() => query(slug, resolvedLocale), ["author", slug, resolvedLocale], {
      tags: [cacheTag({ locale: resolvedLocale, type: "postsList" })],
    })();
  }
);
