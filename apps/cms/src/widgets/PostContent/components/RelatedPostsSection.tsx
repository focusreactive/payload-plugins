import { SectionHeader } from "@/components/SectionHeader";
import { BlogPostCard } from "@/components/blog";
import { getTranslations } from "next-intl/server";
import NextImage from "next/image";

import { BLOG_CONFIG } from "@/core/config/blog";
import { Link, SectionContainer } from "@/components/shared";
import { readingTimeMinutes } from "@/core/utils/readingTime";
import type { Category, Post } from "@/payload-types";

interface RelatedPostsSectionProps {
  posts: Post[];
  relatedPostsLabel?: string | null;
}

export async function RelatedPostsSection({ posts, relatedPostsLabel }: RelatedPostsSectionProps) {
  const t = await getTranslations("blog");

  return (
    <SectionContainer sectionData={{ theme: "light-gray" }}>
      {relatedPostsLabel && (
        <SectionHeader title={relatedPostsLabel} size="h-section" className="mb-[38px]" />
      )}

      <div className="grid grid-cols-1 gap-[22px] min-[621px]:grid-cols-2 min-[981px]:grid-cols-3">
        {posts.map((post) => {
          const heroImage =
            typeof post.heroImage === "object" && post.heroImage !== null
              ? post.heroImage
              : undefined;
          const category = post.categories?.find(
            (entry): entry is Category => typeof entry === "object" && entry !== null
          );

          return (
            <Link key={post.slug} href={`${BLOG_CONFIG.basePath}/${post.slug}`} className="block">
              <BlogPostCard
                title={post.title}
                category={category?.title}
                readTime={t("readTime", { minutes: readingTimeMinutes(post.content) })}
                image={
                  <NextImage
                    src={heroImage?.url ?? "/empty-placeholder.jpg"}
                    alt={heroImage?.alt ?? ""}
                    fill
                    className="object-cover"
                    quality={85}
                    sizes="(max-width: 620px) 100vw, (max-width: 980px) 50vw, 33vw"
                  />
                }
              />
            </Link>
          );
        })}
      </div>
    </SectionContainer>
  );
}
