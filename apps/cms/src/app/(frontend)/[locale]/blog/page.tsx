import type { Metadata } from "next/types";
import React, { Suspense } from "react";

import { BLOG_CONFIG } from "@/core/config/blog";
import { I18N_CONFIG } from "@/core/config/i18n";
import { generateMeta } from "@/core/lib/generateMeta";
import type { Locale } from "@/core/types";
import { getBlogPageSettings } from "@/dal/getBlogPageSettings";
import { getSiteSettings } from "@/dal/getSiteSettings";
import type { Footer as FooterType, Header as HeaderType } from "@/payload-types";
import { Footer, Header } from "@/widgets";

import { BlogJsonLdWrapper } from "./_components/BlogJsonLdWrapper";
import { BlogPageDynamic } from "./_components/BlogPageDynamic";
import { BlogPageSkeleton } from "./_components/BlogPageSkeleton";

interface Props {
  searchParams: Promise<{
    page?: string;
  }>;
  params: Promise<{
    locale: Locale;
  }>;
}

export const experimental_ppr = true;

export default async function Page({ searchParams, params }: Props) {
  const { locale } = await params;

  const siteSettings = await getSiteSettings({ locale });

  return (
    <>
      <Header data={siteSettings.header as HeaderType} />
      <main>
        <Suspense>
          <BlogJsonLdWrapper searchParams={searchParams} locale={locale} />
        </Suspense>
        <Suspense fallback={<BlogPageSkeleton />}>
          <BlogPageDynamic searchParams={searchParams} locale={locale} />
        </Suspense>
      </main>
      <Footer data={siteSettings.footer as FooterType} />
    </>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  const blogSettings = await getBlogPageSettings({ locale });

  return generateMeta({
    collection: "posts",
    doc: {
      meta: {
        description:
          blogSettings.blogMeta?.description || blogSettings.blogDescription,
        image: blogSettings.blogMeta?.image,
        robots: blogSettings.blogMeta?.robots,
        title: blogSettings.blogMeta?.title,
      },
      slug: BLOG_CONFIG.slug,
      title: blogSettings.blogTitle || "Blog",
    },
    locale,
  });
}

export async function generateStaticParams() {
  return I18N_CONFIG.locales.map((locale) => ({
    locale: locale.code,
  }));
}
