import { BLOG_CONFIG, postPath } from "@/lib/config/blog";
import { FEEDS } from "@/lib/config/feeds";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { NEWS_CONFIG } from "@/lib/config/news";
import { postBodyToHtml } from "@/lib/markdown/toHtml";
import type { Locale } from "@/lib/types";
import { cacheTag } from "@/lib/utils/cacheTags";
import { scopedCache } from "@/lib/utils/scopedCache";
import { getPayloadClient } from "@/dal/payload-client";
import type { Author, News, Post, Tag } from "@/payload-types";

export interface FeedEntry {
  /** Site-relative path. */
  path: string;
  title: string;
  published: string;
  updated: string;
  authors: string[];
  tags: { slug: string; title: string }[];
  summary: string;
  html: string;
}

function fromPost(post: Post): FeedEntry {
  return {
    authors: (post.authors ?? [])
      .filter((entry): entry is Author => typeof entry === "object" && entry !== null)
      .map((entry) => entry.name),
    html: postBodyToHtml(post),
    path: postPath(post.slug),
    published: post.publishedAt ?? post.createdAt,
    summary: post.excerpt ?? "",
    tags: (post.tags ?? [])
      .filter((entry): entry is Tag => typeof entry === "object" && entry !== null)
      .map((entry) => ({ slug: entry.slug, title: entry.title })),
    title: post.title,
    updated: post.updatedAt,
  };
}

function fromNews(news: News): FeedEntry {
  return {
    authors: [],
    html: postBodyToHtml(news),
    path: `${NEWS_CONFIG.basePath}/${news.slug}`,
    published: news.publishedAt,
    summary: news.excerpt ?? "",
    tags: [],
    title: news.title,
    updated: news.updatedAt,
  };
}

/**
 * Newest published entries with their bodies, default locale. The site feed mixes blog posts and
 * press releases, as the old feed did; a tag feed holds posts only (news has no tags).
 */
export function getFeedEntries(tag?: string): Promise<FeedEntry[]> {
  const locale = I18N_CONFIG.defaultLocale as Locale;
  return scopedCache(
    async () => {
      const payload = await getPayloadClient();
      const published = { _status: { equals: "published" } } as const;
      const [posts, news] = await Promise.all([
        payload.find({
          collection: BLOG_CONFIG.collection,
          depth: 1,
          limit: FEEDS.limit,
          locale,
          overrideAccess: false,
          sort: "-publishedAt",
          where: { ...published, ...(tag && { "tags.slug": { equals: tag } }) },
        }),
        tag
          ? null
          : payload.find({
              collection: NEWS_CONFIG.collection,
              depth: 0,
              limit: FEEDS.limit,
              locale,
              overrideAccess: false,
              sort: "-publishedAt",
              where: published,
            }),
      ]);

      return [...posts.docs.map(fromPost), ...(news?.docs ?? []).map(fromNews)]
        .toSorted((a, b) => Date.parse(b.published) - Date.parse(a.published))
        .slice(0, FEEDS.limit);
    },
    ["feed", tag ?? "all"],
    {
      tags: [cacheTag({ locale, type: "postsList" }), cacheTag({ locale, type: "newsList" })],
    }
  )();
}
