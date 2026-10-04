import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { toPostsListItem } from "@/blocks/PostsList/Component";
import { PostsList } from "@/blocks/PostsList/ui";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";
import { NewsletterSection } from "@/components/newsletter";
import { Pagination } from "@/components/Pagination";
import { SectionContainer } from "@/components/shared";
import { getAuthorBySlug, getPayloadClient, getPosts } from "@/dal";
import { getSiteSettings } from "@/dal/getSiteSettings";
import { BLOG_CONFIG } from "@/lib/config/blog";
import type { Locale } from "@/lib/types";
import { generateMeta } from "@/lib/utils/generateMeta";
import type { Footer as FooterType, Header as HeaderType, Media, Post } from "@/payload-types";

const PER_PAGE = 9;

interface Props {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

/** §5.3 / §6.8 AUTHOR: light hero (avatar, name, bio, post count) → posts grid → pagination. */
export default async function AuthorPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const author = await getAuthorBySlug({ locale, slug });
  if (!author) {
    notFound();
  }

  const [settings, result] = await Promise.all([
    getSiteSettings({ locale }),
    getPosts(await getPayloadClient(), { author: slug, limit: PER_PAGE, locale, page }),
  ]);
  const avatar =
    typeof author.avatar === "object" && author.avatar ? (author.avatar as Media) : null;
  const initials = author.name
    .split(/\s+/u)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <>
      <Header data={settings.blog.header as HeaderType} />
      <main id="main" tabIndex={-1} className="outline-none">
        <SectionContainer sectionData={{ theme: "light-gray" }}>
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            {avatar?.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- 96px avatar from the CMS
              <img src={avatar.url} alt="" className="size-24 rounded-pill object-cover" />
            ) : (
              <span
                aria-hidden
                className="grid size-24 place-items-center rounded-pill bg-primary-soft text-3xl font-semibold text-primary-soft-foreground"
              >
                {initials}
              </span>
            )}
            <div className="flex flex-col gap-2">
              <p className="text-eyebrow text-muted-foreground">Author</p>
              <h1 className="text-display-2 text-heading">{author.name}</h1>
              {author.bio && (
                <p className="max-w-[60ch] text-lead text-muted-foreground">{author.bio}</p>
              )}
              <p className="text-small text-muted-foreground">
                {result.totalDocs} {result.totalDocs === 1 ? "article" : "articles"}
              </p>
            </div>
          </div>
        </SectionContainer>
        <SectionContainer sectionData={{ theme: "light" }}>
          <PostsList
            items={result.docs.map((post) => toPostsListItem(post as Post, locale))}
            layout="grid"
            emptyText="No articles yet."
          />
          {result.totalPages > 1 && (
            <Pagination
              className="mt-10"
              page={page}
              totalPages={result.totalPages}
              basePath={`${BLOG_CONFIG.basePath}/author/${slug}`}
            />
          )}
        </SectionContainer>
        <SectionContainer sectionData={{ theme: "light-gray" }}>
          <NewsletterSection
            id={`author-${slug}`}
            header={{
              eyebrow: { text: "Newsletter" },
              title: "News from the engineers, once a month",
            }}
            inputPlaceholder="you@company.com"
            buttonLabel="Subscribe"
            disclaimer="One email a month. Unsubscribe anytime."
            theme="light-gray"
          />
        </SectionContainer>
      </main>
      <Footer data={settings.blog.footer as FooterType} />
    </>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const author = await getAuthorBySlug({ locale, slug });
  return generateMeta({
    collection: "posts",
    doc: {
      meta: {
        description: author?.bio ?? undefined,
        robots: author ? "index" : "noindex",
        title: author ? `${author.name} — articles` : "Author",
      },
      slug: `author/${slug}`,
      title: author?.name ?? "Author",
    },
    locale,
  });
}
