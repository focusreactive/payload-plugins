import type { Metadata } from "next";
import React from "react";

import { RenderBlocks } from "@/blocks/RenderBlocks";
import { generateMeta } from "@/core/lib/generateMeta";
import { generateNotFoundMeta } from "@/core/lib/generateNotFoundMeta";
import { parseSlugToPath } from "@/core/lib/parseSlugToPath";
import { BreadcrumbsJsonLd } from "@/core/seo/components";
import type { Locale } from "@/core/types";
import { getPageBySlug } from "@/dal/getPageBySlug";
import { getMainSitePageStaticParams } from "@/dal/staticParams/pages";
import { PayloadRedirects } from "@/features";
import { redirect } from "@/i18n/navigation";
import type { Footer as FooterType, Header as HeaderType } from "@/payload-types";
import { Footer, Header } from "@/widgets";

interface Args {
  params: Promise<{
    slug?: string[];
    locale: Locale;
  }>;
}

export default async function Page({ params }: Args) {
  const { slug = [], locale } = await params;
  const { decodedSegments, url } = parseSlugToPath(slug);

  if (decodedSegments[0] === "home") {
    return redirect({ href: `/${  decodedSegments.slice(1).join("/")}`, locale });
  }

  const page = await getPageBySlug(decodedSegments, locale);

  if (!page) {
    return <PayloadRedirects url={url} locale={locale} />;
  }

  return (
    <>
      <Header data={page.header as HeaderType} />
      <main>
        <div>
          <BreadcrumbsJsonLd items={page.breadcrumbs} locale={locale} />

          <PayloadRedirects disableNotFound url={url} locale={locale} />

          <RenderBlocks blocks={page.blocks} />
        </div>
      </main>
      <Footer data={page.footer as FooterType} />
    </>
  );
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug = [], locale } = await params;
  const { decodedSegments } = parseSlugToPath(slug);

  const page = await getPageBySlug(decodedSegments, locale);

  if (!page) {
    return generateNotFoundMeta({ locale });
  }

  return generateMeta({
    collection: "page",
    doc: page,
    locale,
  });
}

export async function generateStaticParams() {
  return await getMainSitePageStaticParams();
}
