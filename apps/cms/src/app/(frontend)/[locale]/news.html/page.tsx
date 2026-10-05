import type { Metadata } from "next";

import { PostsList } from "@/blocks/PostsList/ui";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";
import { SectionContainer } from "@/components/shared";
import { getAllNews } from "@/dal";
import { getSiteSettings } from "@/dal/getSiteSettings";
import { NEWS_CONFIG } from "@/lib/config/news";
import type { Locale } from "@/lib/types";
import { formatPostDate } from "@/lib/utils/formatPostDate";
import type { Footer as FooterType, Header as HeaderType } from "@/payload-types";

interface Props {
  params: Promise<{ locale: Locale }>;
}

/** Old press-release index (/news.html): every release as a card, newest first. */
export default async function NewsIndexPage({ params }: Props) {
  const { locale } = await params;
  const [settings, news] = await Promise.all([getSiteSettings({ locale }), getAllNews({ locale })]);

  return (
    <>
      <Header data={settings.blog.header as HeaderType} />
      <main id="main" tabIndex={-1} className="outline-none">
        <SectionContainer sectionData={{ theme: "light-gray" }}>
          <div className="flex flex-col gap-2">
            <p className="text-eyebrow text-muted-foreground">News</p>
            <h1 className="text-display-2 text-heading">News &amp; Announcements</h1>
          </div>
        </SectionContainer>
        <SectionContainer sectionData={{ theme: "light" }}>
          <PostsList
            layout="grid"
            emptyText="No announcements yet."
            items={news.map((item) => ({
              date: formatPostDate(item.publishedAt, locale),
              excerpt: item.excerpt,
              href: `${NEWS_CONFIG.basePath}/${item.slug}`,
              isoDate: item.publishedAt,
              tag: "Press release",
              title: item.title,
              year: String(new Date(item.publishedAt).getUTCFullYear()),
            }))}
          />
        </SectionContainer>
      </main>
      <Footer data={settings.blog.footer as FooterType} />
    </>
  );
}

export const metadata: Metadata = {
  alternates: { canonical: NEWS_CONFIG.listingPath },
  title: "News & Announcements",
};
