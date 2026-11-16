import { TrackPage } from "@focus-reactive/payload-plugin-analytics/client";
import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import React from "react";

import { RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { PayloadRedirects } from "@/components/PayloadRedirects";
import { ArticleJsonLd, BreadcrumbsJsonLd } from "@/components/seo/components";
import { Article } from "@/components/site/blog/Article";
import { getBlogIdentity } from "@/components/site/blog/blogData";
import { PostHero } from "@/components/site/blog/PostHero";
import { SitePage } from "@/components/site/layout/SitePage";
import { getSiteChrome } from "@/dal/entities";
import { getPostBySlug } from "@/dal/getPostBySlug";
import { getSiteSettings } from "@/dal/getSiteSettings";
import { getBlogPostStaticParams } from "@/dal/staticParams/posts";
import { BLOG_CONFIG } from "@/lib/config/blog";
import type { Locale } from "@/lib/types";
import { generateMeta } from "@/lib/utils/generateMeta";
import { generateNotFoundMeta } from "@/lib/utils/generateNotFoundMeta";
import { buildUrl } from "@/lib/utils/path/buildUrl";

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

  const [post, chrome, blog, siteSettings] = await Promise.all([
    getPostBySlug({ locale, slug: decodedSlug }),
    getSiteChrome(locale),
    getBlogIdentity(locale),
    getSiteSettings({ locale }),
  ]);

  if (!post) {
    return <PayloadRedirects url={url} locale={locale} />;
  }

  const { isEnabled: draft } = await draftMode();
  const postSlug = stripMarkers(post.slug) ?? decodedSlug;

  return (
    <SitePage
      bodyId={postSlug}
      footer={chrome.footer}
      header={chrome.header}
      hero={<PostHero blog={blog} locale={locale} post={post} />}
      locale={locale}
      path={`${BLOG_CONFIG.basePath}/${postSlug}`}
      template="post"
    >
      <TrackPage collection="posts" enabled={!draft} id={post.id} locale={locale} />
      <ArticleJsonLd
        locale={locale}
        post={post}
        siteName={siteSettings.general?.siteName ?? undefined}
      />
      <BreadcrumbsJsonLd
        blog={{ post: { slug: postSlug, title: post.title }, title: blog.title ?? "Blog" }}
        locale={locale}
      />
      <PayloadRedirects disableNotFound url={url} locale={locale} />
      <Article blog={blog} locale={locale} post={post} />
      <RenderSiteBlocks
        blocks={post.blocks}
        context={{ collection: "posts", doc: post }}
        locale={locale}
      />
    </SitePage>
  );
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug = "", locale } = await params;
  const post = await getPostBySlug({ locale, slug: decodeURIComponent(slug) });

  if (!post) {
    return generateNotFoundMeta({ locale });
  }

  return generateMeta({ collection: "posts", doc: post, locale });
}

export async function generateStaticParams() {
  return getBlogPostStaticParams();
}
