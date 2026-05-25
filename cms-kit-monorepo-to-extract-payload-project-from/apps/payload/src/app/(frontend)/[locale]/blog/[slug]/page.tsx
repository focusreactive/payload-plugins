import type { Metadata } from "next";
import React from "react";

import { generateMeta } from "@/core/lib/generateMeta";
import { generateNotFoundMeta } from "@/core/lib/generateNotFoundMeta";
import { getBlogPageSettings } from "@/core/lib/getBlogPageSettings";
import { getPostBySlug } from "@/core/lib/getPostBySlug";
import { getSiteSettings } from "@/core/lib/getSiteSettings";
import { getBlogPostStaticParams } from "@/core/lib/staticParams/posts";
import { ArticleJsonLd, BreadcrumbsJsonLd } from "@/core/seo/components";
import type { Locale } from "@/core/types";
import { buildUrl } from "@/core/utils/path/buildUrl";
import { PayloadRedirects } from "@/features";
import type { Footer as FooterType, Header as HeaderType } from "@/payload-types";
import { Footer, Header, PostContent } from "@/widgets";

interface Args {
  params: Promise<{
    slug?: string;
    locale: Locale;
  }>;
}

export default async function Page({ params }: Args) {
  const { slug = "", locale } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const url = buildUrl({ collection: "posts", locale, slug: decodedSlug });

  const [post, siteSettings, blogSettings] = await Promise.all([
    getPostBySlug({ locale, slug: decodedSlug }),
    getSiteSettings({ locale }),
    getBlogPageSettings({ locale }),
  ]);

  if (!post) {
    return <PayloadRedirects url={url} locale={locale} />;
  }

  return (
    <>
      <Header data={siteSettings.header as HeaderType} />
      <main>
        <ArticleJsonLd
          post={post}
          siteName={siteSettings.siteName as string}
          locale={locale}
        />
        <BreadcrumbsJsonLd
          locale={locale}
          blog={{
            post: {
              slug: post.slug ?? decodedSlug,
              title: post.title,
            },
            title: blogSettings.blogTitle || "Blog",
          }}
        />

        <PayloadRedirects disableNotFound url={url} locale={locale} />

        <PostContent
          post={post}
          locale={locale}
          relatedPostsLabel={blogSettings.relatedPostsLabel}
          readMoreLabel={blogSettings.readMoreLabel}
        />
      </main>
      <Footer data={siteSettings.footer as FooterType} />
    </>
  );
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug = "", locale } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getPostBySlug({ locale, slug: decodedSlug });

  if (!post) {
    return generateNotFoundMeta({ locale });
  }

  return generateMeta({
    collection: "posts",
    doc: post,
    locale,
  });
}

export async function generateStaticParams() {
  return getBlogPostStaticParams();
}
