import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";

import { BLOG_CONFIG } from "@/lib/config/blog";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { cacheTag } from "@/lib/utils/cacheTags";
import { getLastModifiedDate } from "@/lib/utils/getLastModifiedDate";
import { getServerSideURL } from "@/lib/utils/getURL";
import type { Locale } from "@/lib/types";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import { getAllDocuments, getBlogPageSettings, getPayloadClient } from "@/dal";

type Sitemap = MetadataRoute.Sitemap;

async function generateSitemap(): Promise<Sitemap> {
  const payload = await getPayloadClient();
  const baseUrl = getServerSideURL();
  const changeFrequency: Sitemap[number]["changeFrequency"] = "weekly";
  const locales = I18N_CONFIG.locales.map((locale) => locale.code) as Locale[];
  try {
    const sitemap: Sitemap = [];

    await Promise.all(
      locales.map(async (locale) => {
        const [allPages, allPosts, blogSettings] = await Promise.all([
          getAllDocuments(payload, "page", {
            depth: 1,
            locale,
            overrideAccess: false,
            select: {
              breadcrumbs: true,
              meta: true,
              slug: true,
              updatedAt: true,
            },
            sort: "-updatedAt",
            where: {
              _status: { equals: "published" },
            },
          }),
          getAllDocuments(payload, BLOG_CONFIG.collection, {
            locale,
            overrideAccess: false,
            select: {
              meta: true,
              publishedAt: true,
              slug: true,
              updatedAt: true,
            },
            sort: "-publishedAt",
            where: {
              _status: { equals: "published" },
            },
          }),
          getBlogPageSettings({ locale }),
        ]);

        const pages = allPages.filter((page) => {
          const robots = page.meta?.robots;
          return robots === "index" || robots === undefined;
        });

        const posts = allPosts.filter((post) => {
          const robots = post.meta?.robots;
          return robots === "index" || robots === undefined;
        });

        const homeUrl = buildUrl({ collection: "page", locale });

        pages.forEach((page) => {
          const url = buildUrl({
            breadcrumbs: page.breadcrumbs,
            collection: "page",
            locale,
          });
          const isHome = url === homeUrl;
          sitemap.push({
            changeFrequency,
            lastModified: page.updatedAt ? new Date(page.updatedAt) : new Date(),
            priority: isHome ? 1 : 0.8,
            url,
          });
        });

        const blogLastModified = getLastModifiedDate(posts[0]?.publishedAt) || new Date();

        sitemap.push({
          changeFrequency,
          lastModified: blogLastModified,
          priority: 0.9,
          url: buildUrl({ collection: "posts", locale }),
        });

        posts.forEach((post) => {
          sitemap.push({
            changeFrequency: "monthly",
            lastModified: post.publishedAt
              ? new Date(post.publishedAt)
              : post.updatedAt
                ? new Date(post.updatedAt)
                : new Date(),
            priority: 0.7,
            url: buildUrl({
              collection: "posts",
              locale,
              slug: post.slug,
            }),
          });
        });
      })
    );

    return sitemap;
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return [
      {
        changeFrequency,
        lastModified: new Date(),
        priority: 1,
        url: baseUrl,
      },
    ];
  }
}

const getCachedSitemap = unstable_cache(
  async () => generateSitemap(),
  [cacheTag({ type: "sitemap" })],
  {
    revalidate: false,
    tags: [cacheTag({ type: "sitemap" })],
  }
);

export default async function sitemap(): Promise<Sitemap> {
  return getCachedSitemap();
}
