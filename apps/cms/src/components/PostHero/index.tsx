import { DisplayHeading } from "@/components/DisplayHeading";
import { AbstractBackdrop } from "@/components/AbstractBackdrop";
import { Eyebrow } from "@/components/Eyebrow";
import { getTranslations } from "next-intl/server";
import NextImage from "next/image";

import { BLOG_CONFIG } from "@/lib/config/blog";
import type { Locale } from "@/lib/types";
import { readingTimeMinutes } from "@/lib/utils/readingTime";
import type { Author, Category, Post } from "@/payload-types";

import { Link } from "@/components/shared";

import { AuthorAvatar } from "../AuthorAvatar";

interface PostHeroProps {
  post: Post;
  locale: Locale;
}

function DotSeparator() {
  return <span aria-hidden className="inline-block size-1 rounded-pill bg-current opacity-60" />;
}

export async function PostHero({ post, locale }: PostHeroProps) {
  const t = await getTranslations("blog");

  const categories = (post.categories ?? []).filter(
    (entry): entry is Category => typeof entry === "object" && entry !== null
  );
  const author = post.authors?.find(
    (entry): entry is Author => typeof entry === "object" && entry !== null
  );
  // Generated covers repeat the splash (title on dark blue), so only real images are shown below it.
  const heroImage =
    typeof post.heroImage === "object" &&
    post.heroImage !== null &&
    !post.heroImage.filename?.startsWith("cover-")
      ? post.heroImage
      : undefined;
  const publishedDate = post.publishedAt
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(post.publishedAt)
      )
    : null;

  // §6.8 POST splash: dark blue, back link, tag pills, display-2 title, meta with the date in
  // electric green.
  return (
    <div>
      <section
        data-theme="dark"
        className="dark-zone relative overflow-hidden bg-ct-dark-blue pb-[clamp(40px,6vw,72px)] pt-[clamp(32px,5vw,56px)] text-ct-white"
      >
        <AbstractBackdrop tone="dark" intensity="subtle" />
        <div className="relative mx-auto flex min-h-[clamp(240px,32vh,360px)] w-full max-w-containerMaxW flex-col gap-6 px-containerBase">
          <Link
            href={BLOG_CONFIG.basePath}
            className="inline-flex w-fit items-center gap-2 text-[0.9375rem] font-semibold text-ct-white underline-offset-[3px] hover:text-ct-electric-green hover:underline"
          >
            <span aria-hidden>←</span> {t("backToJournal")}
          </Link>

          <div className="mt-auto flex flex-col gap-5">
            {categories.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Eyebrow tone="tag">{category.title}</Eyebrow>
                  </li>
                ))}
              </ul>
            )}

            <DisplayHeading as="h1" size="display-2" text={post.title} className="max-w-[20em]" />

            <div className="flex flex-wrap items-center gap-[14px] text-[0.9375rem] text-ct-grey-300">
              {publishedDate && (
                <time
                  dateTime={post.publishedAt ?? undefined}
                  className="whitespace-nowrap text-ct-electric-green"
                >
                  {publishedDate}
                </time>
              )}
              {publishedDate && <DotSeparator />}
              <span className="whitespace-nowrap">
                {t("readTimeLong", {
                  minutes: post.readingTime ?? readingTimeMinutes(post.content),
                })}
              </span>
              {author && <DotSeparator />}
              {author &&
                (author.slug ? (
                  <Link
                    href={`${BLOG_CONFIG.basePath}/author/${author.slug}`}
                    className="flex items-center gap-2.5 whitespace-nowrap text-ct-white underline-offset-[3px] hover:text-ct-electric-green hover:underline"
                  >
                    <AuthorAvatar author={author} size="sm" />
                    {author.name}
                  </Link>
                ) : (
                  <span className="flex items-center gap-2.5 whitespace-nowrap text-ct-white">
                    <AuthorAvatar author={author} size="sm" />
                    {author.name}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </section>

      {heroImage && (
        <section className="pt-sectionBase">
          <div className="mx-auto w-full max-w-containerMaxW px-containerBase">
            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg bg-surface-muted">
              <NextImage
                src={heroImage.url ?? "/empty-placeholder.jpg"}
                alt={heroImage.alt ?? ""}
                fill
                priority
                quality={85}
                className="object-cover"
                sizes="(max-width: 1180px) 100vw, 1180px"
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
