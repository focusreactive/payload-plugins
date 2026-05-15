import { BLOG_CONFIG } from "@/core/config/blog";
import { I18N_CONFIG } from "@/core/config/i18n";
import type { Locale } from "@/core/types";
import { getPayloadClient } from "@/dal/payload-client";

export type BlogPostStaticParams = { locale: string; slug: string }[];

export async function getBlogPostStaticParams(): Promise<BlogPostStaticParams> {
  const payload = await getPayloadClient();

  const results: BlogPostStaticParams = [];

  for (const localeConfig of I18N_CONFIG.locales) {
    const locale = localeConfig.code as Locale;

    const posts = await payload.find({
      collection: BLOG_CONFIG.collection,
      draft: false,
      limit: 1000,
      locale,
      overrideAccess: true,
      pagination: false,
      select: { slug: true },
      where: {
        _status: { equals: "published" },
      },
    });

    for (const post of posts.docs) {
      if (post.slug) {
        results.push({
          locale,
          slug: post.slug,
        });
      }
    }
  }

  return results;
}
