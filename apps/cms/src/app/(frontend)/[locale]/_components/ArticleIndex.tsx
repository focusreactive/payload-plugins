import { toPostsListItem } from "@/blocks/PostsList/Component";
import { PostsList } from "@/blocks/PostsList/ui";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";
import { Pagination } from "@/components/Pagination";
import { SectionContainer } from "@/components/shared";
import { getSiteSettings } from "@/dal/getSiteSettings";
import type { Locale } from "@/lib/types";
import type { Footer as FooterType, Header as HeaderType, Post } from "@/payload-types";

interface ArticleIndexProps {
  locale: Locale;
  title: string;
  posts: Post[];
  /** Year headings between rows, as on the old full archive. */
  yearSeparators?: boolean;
  pagination?: { page: number; totalPages: number; basePath: string };
}

/** The old Pelican article indexes (/updates.html, /archives.html): title, date, author, summary. */
export async function ArticleIndex({
  locale,
  title,
  posts,
  yearSeparators,
  pagination,
}: ArticleIndexProps) {
  const settings = await getSiteSettings({ locale });

  return (
    <>
      <Header data={settings.blog.header as HeaderType} />
      <main id="main" tabIndex={-1} className="outline-none">
        <SectionContainer sectionData={{ theme: "light-gray" }}>
          <h1 className="text-display-2 text-heading">{title}</h1>
        </SectionContainer>
        <SectionContainer sectionData={{ theme: "light" }}>
          <PostsList
            items={posts.map((post) => toPostsListItem(post, locale))}
            layout="list"
            yearSeparators={yearSeparators}
            emptyText="No articles yet."
          />
          {pagination && pagination.totalPages > 1 && (
            <Pagination
              className="mt-10"
              page={pagination.page}
              totalPages={pagination.totalPages}
              basePath={pagination.basePath}
            />
          )}
        </SectionContainer>
      </main>
      <Footer data={settings.blog.footer as FooterType} />
    </>
  );
}
