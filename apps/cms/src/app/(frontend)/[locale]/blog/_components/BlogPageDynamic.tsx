import { BLOG_CONFIG } from "@/lib/config/blog";
import type { Locale } from "@/lib/types";
import { getBlogPageSettings, getPayloadClient, getPosts } from "@/dal";
import { redirect } from "@/lib/i18n/navigation";
import { BlogPageContent } from "./BlogPageContent";

interface BlogPageDynamicProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
  }>;
  locale: Locale;
}

export async function BlogPageDynamic({ searchParams, locale }: BlogPageDynamicProps) {
  const { page, q } = await searchParams;
  const pageNumber = page ? Number.parseInt(page, 10) : 1;
  const searchQuery = q?.trim() || undefined;

  if (pageNumber < 1 || !Number.isInteger(pageNumber)) {
    redirect({ href: BLOG_CONFIG.basePath, locale });
  }

  const payload = await getPayloadClient();

  const postsPromise = getPosts(payload, {
    locale,
    page: pageNumber,
    query: searchQuery,
  });

  const [posts, blogSettings, allTags] = await Promise.all([
    postsPromise,
    getBlogPageSettings({ locale }),
    payload.find({
      collection: "tags",
      depth: 0,
      limit: 100,
      locale,
      overrideAccess: false,
      select: { slug: true, title: true },
      sort: "title",
    }),
  ]);

  if (pageNumber > posts.totalPages && posts.totalPages > 0) {
    redirect({ href: BLOG_CONFIG.basePath, locale });
  }

  return (
    <BlogPageContent
      posts={posts.docs}
      currentPage={posts.page ?? pageNumber}
      totalPages={posts.totalPages}
      eyebrow={blogSettings.eyebrow}
      blogTitle={blogSettings.title}
      searchPlaceholder={blogSettings.searchPlaceholder}
      readMoreLabel={blogSettings.readMoreLabel}
      tags={allTags.docs}
      searchQuery={searchQuery}
      locale={locale}
    />
  );
}
