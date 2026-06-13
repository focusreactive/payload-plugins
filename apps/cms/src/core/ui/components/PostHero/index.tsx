import { DisplayHeading, Eyebrow } from "@repo/ui";
import { getTranslations } from "next-intl/server";
import NextImage from "next/image";

import { BLOG_CONFIG } from "@/core/config/blog";
import type { Locale } from "@/core/types";
import { readingTimeMinutes } from "@/core/utils/readingTime";
import type { Author, Category, Post } from "@/payload-types";

import { AuthorAvatar } from "../AuthorAvatar";
import { Link } from "../Link";

interface PostHeroProps {
  post: Post;
  locale: Locale;
}

function DotSeparator() {
  return <span aria-hidden className="inline-block size-1 rounded-pill bg-border-strong" />;
}

export async function PostHero({ post, locale }: PostHeroProps) {
  const t = await getTranslations("blog");

  const category = post.categories?.find((entry): entry is Category => typeof entry === "object" && entry !== null);
  const author = post.authors?.find((entry): entry is Author => typeof entry === "object" && entry !== null);
  const heroImage = typeof post.heroImage === "object" && post.heroImage !== null ? post.heroImage : undefined;
  const publishedDate = post.publishedAt ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(post.publishedAt)) : null;

  return (
    <div>
      <section className="pb-[clamp(28px,4vw,44px)] pt-[clamp(40px,6vw,72px)]">
        <div className="mx-auto w-full max-w-containerMaxW px-containerBase">
          <div className="mb-[26px]">
            <Link
              href={BLOG_CONFIG.basePath}
              className="inline-flex items-center gap-2 text-[0.95rem] font-semibold text-foreground transition-colors hover:text-primary motion-reduce:transition-none"
            >
              <span aria-hidden>←</span> {t("backToJournal")}
            </Link>
          </div>

          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-[22px] text-center">
            {category && (
              <Eyebrow prefix="dot" tone="accent">
                {category.title}
              </Eyebrow>
            )}

            <DisplayHeading as="h1" size="display-1" text={post.title} />

            <div className="flex flex-wrap items-center justify-center gap-[18px] text-[0.92rem] text-muted-foreground">
              {author && (
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <AuthorAvatar author={author} size="sm" />
                  {author.name}
                </span>
              )}
              {author && publishedDate && <DotSeparator />}
              {publishedDate && (
                <time dateTime={post.publishedAt ?? undefined} className="whitespace-nowrap">
                  {publishedDate}
                </time>
              )}
              {(author || publishedDate) && <DotSeparator />}
              <span className="whitespace-nowrap">{t("readTimeLong", { minutes: readingTimeMinutes(post.content) })}</span>
            </div>
          </div>
        </div>
      </section>

      {heroImage && (
        <section>
          <div className="mx-auto w-full max-w-containerMaxW px-containerBase">
            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg bg-surface-muted">
              <NextImage src={heroImage.url ?? "/empty-placeholder.jpg"} alt={heroImage.alt ?? ""} fill priority quality={85} className="object-cover" sizes="(max-width: 1180px) 100vw, 1180px" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
