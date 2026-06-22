import { DisplayHeading, Eyebrow } from "@/components/ui";
import { getTranslations } from "next-intl/server";

import { BLOG_CONFIG } from "@/core/config/blog";
import type { Locale } from "@/core/types";
import { EmptyState, Pagination } from "@/core/ui";

import { BlogFilterProvider } from "./components/BlogFilterProvider";
import { DimWhilePending } from "./components/DimWhilePending";
import { FeaturedPost } from "./components/FeaturedPost";
import { FilterChip } from "./components/FilterChip";
import { NewsletterBand } from "./components/NewsletterBand";
import { PostsGrid } from "./components/PostsGrid";
import { SearchOverlay } from "./components/SearchOverlay";
import type { BlogListPost } from "./types";
import { blogHref } from "./utils/blogHref";

interface BlogPageContentProps {
  posts: BlogListPost[];
  currentPage: number;
  totalPages: number;
  eyebrow?: string | null;
  blogTitle?: string | null;
  searchPlaceholder?: string | null;
  readMoreLabel?: string | null;
  categories: { title: string; slug: string }[];
  activeCategory?: string;
  searchQuery?: string;
  locale: Locale;
}

export async function BlogPageContent({ posts, currentPage, totalPages, eyebrow, blogTitle, searchPlaceholder, readMoreLabel, categories, activeCategory, searchQuery, locale }: BlogPageContentProps) {
  const t = await getTranslations("blog");

  const showFeatured = currentPage === 1 && !activeCategory && !searchQuery && posts.length > 0;
  const featuredPost = showFeatured ? posts[0] : undefined;
  const gridPosts = showFeatured ? posts.slice(1) : posts;

  return (
    <BlogFilterProvider>
      <section className="pt-[clamp(48px,7vw,88px)]">
        <div className="mx-auto w-full max-w-containerMaxW px-containerBase">
          <div className="mx-auto flex max-w-[720px] flex-col items-center gap-5 text-center">
            {eyebrow && (
              <Eyebrow prefix="dot" tone="accent">
                {eyebrow}
              </Eyebrow>
            )}
            {blogTitle && <DisplayHeading as="h1" size="display-1" text={blogTitle} />}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5 py-2">
            <div className="flex flex-wrap gap-2.5">
              <FilterChip href={blogHref({ q: searchQuery })} label={t("all")} isActive={!activeCategory} />
              {categories.map((category) => (
                <FilterChip key={category.slug} href={blogHref({ category: category.slug, q: searchQuery })} label={category.title} isActive={activeCategory === category.slug} />
              ))}
            </div>
            <SearchOverlay placeholder={searchPlaceholder ?? ""} activeCategory={activeCategory} initialQuery={searchQuery} />
          </div>
        </div>
      </section>

      <section className="pb-sectionBase pt-[clamp(28px,4vw,44px)]">
        <div className="mx-auto w-full max-w-containerMaxW px-containerBase">
          <DimWhilePending>
            {featuredPost && <FeaturedPost post={featuredPost} readMoreLabel={readMoreLabel} locale={locale} className="mb-sectionBase" />}

            {posts.length === 0 && <EmptyState title={t("noResults")} description="" />}

            {gridPosts.length > 0 && <PostsGrid posts={gridPosts} />}
          </DimWhilePending>

          {totalPages > 1 && <Pagination basePath={BLOG_CONFIG.basePath} page={currentPage} totalPages={totalPages} query={{ category: activeCategory, q: searchQuery }} />}
        </div>
      </section>

      <NewsletterBand />
    </BlogFilterProvider>
  );
}
