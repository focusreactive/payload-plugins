import { BlogPostCard } from "@repo/ui";
import { getTranslations } from "next-intl/server";
import NextImage from "next/image";

import { BLOG_CONFIG } from "@/core/config/blog";
import { Link } from "@/core/ui";
import { readingTimeMinutes } from "@/core/utils/readingTime";
import type { Category } from "@/payload-types";

import type { BlogListPost } from "../types";

interface PostsGridProps {
  posts: BlogListPost[];
}

export async function PostsGrid({ posts }: PostsGridProps) {
  const t = await getTranslations("blog");

  return (
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
              excerpt={post.excerpt}
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
  );
}
