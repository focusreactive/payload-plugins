import { getTranslations } from "next-intl/server";
import NextImage from "next/image";

import { BLOG_CONFIG } from "@/core/config/blog";
import { cn } from "@/core/lib/utils";
import type { Locale } from "@/core/types";
import { Link } from "@/components/shared";
import { AuthorAvatar } from "@/components/shared/components/AuthorAvatar";
import { readingTimeMinutes } from "@/core/utils/readingTime";
import type { Author, Category } from "@/payload-types";

import type { BlogListPost } from "../types";

interface FeaturedPostProps {
  post: BlogListPost;
  readMoreLabel?: string | null;
  locale: Locale;
  className?: string;
}

export async function FeaturedPost({ post, readMoreLabel, locale, className }: FeaturedPostProps) {
  const t = await getTranslations("blog");

  const category = post.categories?.find((entry): entry is Category => typeof entry === "object" && entry !== null);
  const author = post.authors?.find((entry): entry is Author => typeof entry === "object" && entry !== null);
  const heroImage = typeof post.heroImage === "object" && post.heroImage !== null ? post.heroImage : undefined;
  const publishedDate = post.publishedAt ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(post.publishedAt)) : null;

  return (
    <Link href={`${BLOG_CONFIG.basePath}/${post.slug}`} className={cn("group grid grid-cols-1 items-center gap-[clamp(28px,5vw,64px)] min-[861px]:grid-cols-[1.15fr_0.85fr]", className)}>
      <div className="relative aspect-[16/11] w-full overflow-hidden rounded-lg bg-surface-muted">
        <NextImage src={heroImage?.url ?? "/empty-placeholder.jpg"} alt={heroImage?.alt ?? ""} fill priority className="object-cover" quality={85} sizes="(max-width: 860px) 100vw, 60vw" />
      </div>

      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-wrap items-center gap-3 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-muted-foreground">
          {category && (
            <>
              <span className="whitespace-nowrap text-primary">{category.title}</span>
              <span aria-hidden className="inline-block size-1 rounded-pill bg-border-strong" />
            </>
          )}
          <span className="whitespace-nowrap">{t("readTimeLong", { minutes: readingTimeMinutes(post.content) })}</span>
        </div>

        <h2 className="text-balance text-h-section text-foreground transition-colors group-hover:text-primary motion-reduce:transition-none">{post.title}</h2>

        {post.excerpt && <p className="text-body-lg text-muted-foreground">{post.excerpt}</p>}

        {(author || publishedDate) && (
          <div className="mt-1.5 flex items-center gap-[18px]">
            {author && <AuthorAvatar author={author} size="md" />}
            <div>
              {author && <div className="text-[0.95rem] font-semibold">{author.name}</div>}
              {publishedDate && (
                <time dateTime={post.publishedAt ?? undefined} className="text-[0.82rem] text-muted-foreground">
                  {publishedDate}
                </time>
              )}
            </div>
          </div>
        )}

        {readMoreLabel && (
          <span className="mt-2 inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-primary motion-reduce:transition-none">
            {readMoreLabel} <span aria-hidden>→</span>
          </span>
        )}
      </div>
    </Link>
  );
}
