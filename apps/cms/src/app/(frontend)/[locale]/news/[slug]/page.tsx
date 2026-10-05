import type { Metadata } from "next";
import React from "react";

import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";
import { MarkdownBody } from "@/components/MarkdownBody";
import { PayloadRedirects } from "@/components/PayloadRedirects";
import { RichText, SectionContainer } from "@/components/shared";
import { getNewsBySlug } from "@/dal/getNewsBySlug";
import { getSiteSettings } from "@/dal/getSiteSettings";
import { getNewsStaticParams } from "@/dal/staticParams/news";
import type { Locale } from "@/lib/types";
import { formatPostDate } from "@/lib/utils/formatPostDate";
import { generateMeta } from "@/lib/utils/generateMeta";
import { generateNotFoundMeta } from "@/lib/utils/generateNotFoundMeta";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Footer as FooterType, Header as HeaderType } from "@/payload-types";

interface Args {
  params: Promise<{ slug?: string; locale: Locale }>;
}

export default async function Page({ params }: Args) {
  const { slug = "", locale } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const url = buildUrl({ collection: "news", locale, slug: decodedSlug });

  const [news, siteSettings] = await Promise.all([
    getNewsBySlug({ locale, slug: decodedSlug }),
    getSiteSettings({ locale }),
  ]);

  if (!news) {
    return <PayloadRedirects url={url} locale={locale} />;
  }

  return (
    <>
      <Header data={siteSettings.blog.header as HeaderType} />
      <main id="main" tabIndex={-1} className="outline-none">
        <PayloadRedirects disableNotFound url={url} locale={locale} />
        <article>
          <SectionContainer sectionData={{ theme: "light-gray" }}>
            <div className="flex max-w-[820px] flex-col gap-4">
              <p className="text-eyebrow text-muted-foreground">News</p>
              <h1 className="text-display-2 text-heading">{news.title}</h1>
              <time dateTime={news.publishedAt} className="text-small text-muted-foreground">
                {formatPostDate(news.publishedAt, locale)}
              </time>
            </div>
          </SectionContainer>
          <SectionContainer sectionData={{ theme: "light" }}>
            <div className="mx-auto max-w-[720px]">
              {news.content && <RichText content={news.content} variant="copy" />}
              {news.markdown?.trim() && <MarkdownBody markdown={news.markdown} />}
            </div>
          </SectionContainer>
        </article>
      </main>
      <Footer data={siteSettings.blog.footer as FooterType} />
    </>
  );
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug = "", locale } = await params;
  const news = await getNewsBySlug({ locale, slug: decodeURIComponent(slug) });

  if (!news) {
    return generateNotFoundMeta({ locale });
  }

  return generateMeta({
    collection: "news",
    doc: {
      ...news,
      meta: { ...news.meta, description: news.meta?.description || news.excerpt || undefined },
    },
    locale,
  });
}

export async function generateStaticParams() {
  return getNewsStaticParams();
}
