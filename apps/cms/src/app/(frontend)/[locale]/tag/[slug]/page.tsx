import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { toPostsListItem } from "@/blocks/PostsList/Component";
import { PostsList } from "@/blocks/PostsList/ui";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";
import { Pagination } from "@/components/Pagination";
import { SectionContainer } from "@/components/shared";
import { getPayloadClient, getPosts, getTagBySlug } from "@/dal";
import { getSiteSettings } from "@/dal/getSiteSettings";
import { BLOG_CONFIG } from "@/lib/config/blog";
import type { Locale } from "@/lib/types";
import { generateMeta } from "@/lib/utils/generateMeta";
import type { Footer as FooterType, Header as HeaderType, Post } from "@/payload-types";

const PER_PAGE = 9;

interface Props {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

/** Old-site tag listing (/tag/<slug>): tag name, post count, posts grid, pagination. */
export default async function TagPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const slug = decodeURIComponent((await params).slug);
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const tag = await getTagBySlug({ locale, slug });
  if (!tag) {
    notFound();
  }

  const [settings, result] = await Promise.all([
    getSiteSettings({ locale }),
    getPosts(await getPayloadClient(), { limit: PER_PAGE, locale, page, tag: slug }),
  ]);

  return (
    <>
      <Header data={settings.blog.header as HeaderType} />
      <main id="main" tabIndex={-1} className="outline-none">
        <SectionContainer sectionData={{ theme: "light-gray" }}>
          <div className="flex flex-col gap-2">
            <p className="text-eyebrow text-muted-foreground">Tag</p>
            <h1 className="text-display-2 text-heading">{tag.title}</h1>
            <p className="text-small text-muted-foreground">
              {result.totalDocs} {result.totalDocs === 1 ? "article" : "articles"}
            </p>
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
              basePath={`${BLOG_CONFIG.tagBasePath}/${slug}`}
            />
          )}
        </SectionContainer>
      </main>
      <Footer data={settings.blog.footer as FooterType} />
    </>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const slug = decodeURIComponent((await params).slug);
  const tag = await getTagBySlug({ locale, slug });
  return generateMeta({
    collection: "tags",
    doc: {
      meta: {
        robots: tag ? "index" : "noindex",
        title: tag ? `${tag.title} — articles` : "Tag",
      },
      slug,
      title: tag?.title ?? "Tag",
    },
    locale,
  });
}
