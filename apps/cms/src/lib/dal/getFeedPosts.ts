import { BLOG_CONFIG } from "@/lib/config/blog";
import { FEEDS } from "@/lib/config/feeds";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import { cacheTag } from "@/lib/utils/cacheTags";
import { scopedCache } from "@/lib/utils/scopedCache";
import { getPayloadClient } from "@/dal/payload-client";
import type { Post } from "@/payload-types";

/** Newest published posts with their bodies, default locale; optionally one category (§5.5). */
export function getFeedPosts(category?: string): Promise<Post[]> {
  const locale = I18N_CONFIG.defaultLocale as Locale;
  return scopedCache(
    async () => {
      const payload = await getPayloadClient();
      const result = await payload.find({
        collection: BLOG_CONFIG.collection,
        depth: 1,
        limit: FEEDS.limit,
        locale,
        overrideAccess: false,
        sort: "-publishedAt",
        where: {
          _status: { equals: "published" },
          ...(category && { "categories.slug": { equals: category } }),
        },
      });
      return result.docs as Post[];
    },
    ["feed", category ?? "all"],
    { tags: [cacheTag({ locale, type: "postsList" })] }
  )();
}
