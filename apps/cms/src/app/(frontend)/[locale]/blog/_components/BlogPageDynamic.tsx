import { BLOG_CONFIG } from "@/core/config/blog";
import type { Locale } from "@/core/types";
import { getBlogPageSettings, getPayloadClient, getPosts, searchPosts } from "@/dal";
import { redirect } from "@/i18n/navigation";
import { BlogPageContent } from "@/widgets";

interface BlogPageDynamicProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    q?: string;
  }>;
  locale: Locale;
}

export async function BlogPageDynamic({ searchParams, locale }: BlogPageDynamicProps) {
  const { page, category, q } = await searchParams;
  const pageNumber = page ? Number.parseInt(page, 10) : 1;
  const activeCategory = category?.trim() || undefined;
  const searchQuery = q?.trim() || undefined;

  if (pageNumber < 1 || !Number.isInteger(pageNumber)) {
    redirect({ href: BLOG_CONFIG.basePath, locale });
  }

  const payload = await getPayloadClient();

  const postsPromise = searchQuery
    ? searchPosts({
        category: activeCategory,
        locale,
        page: pageNumber,
        query: searchQuery,
      })
    : getPosts(payload, {
        category: activeCategory,
        locale,
        page: pageNumber,
      });

  const [posts, blogSettings, allCategories] = await Promise.all([
    postsPromise,
    getBlogPageSettings({ locale }),
    payload.find({
      collection: "categories",
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
      blogTitle={blogSettings.blogTitle}
      searchPlaceholder={blogSettings.searchPlaceholder}
      readMoreLabel={blogSettings.readMoreLabel}
      categories={allCategories.docs}
      activeCategory={activeCategory}
      searchQuery={searchQuery}
      locale={locale}
    />
  );
}
