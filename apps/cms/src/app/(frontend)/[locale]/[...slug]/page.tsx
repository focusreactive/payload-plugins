import { TrackPage } from "@focus-reactive/payload-plugin-analytics/client";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import React from "react";

import { RenderBlocks } from "@/blocks/RenderBlocks";
import { SYNTHETIC_REFS } from "@/lib/plugins/analytics/SYNTHETIC_REFS";
import { generateMeta } from "@/lib/utils/generateMeta";
import { generateNotFoundMeta } from "@/lib/utils/generateNotFoundMeta";
import { parseSlugToPath } from "@/lib/utils/parseSlugToPath";
import { BreadcrumbsJsonLd } from "@/components/seo/components";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ChildPages } from "@/components/ChildPages";
import type { Locale } from "@/lib/types";
import { getPageBySlug } from "@/dal/getPageBySlug";
import { getMainSitePageStaticParams } from "@/dal/staticParams/pages";
import { PayloadRedirects } from "@/components/PayloadRedirects";
import { redirect } from "@/lib/i18n/navigation";
import type { Footer as FooterType, Header as HeaderType } from "@/payload-types";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";

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
    return redirect({ href: `/${decodedSegments.slice(1).join("/")}`, locale });
  }

  const page = await getPageBySlug(decodedSegments, locale);
  const { isEnabled: draft } = await draftMode();

  if (!page) {
    return <PayloadRedirects url={url} locale={locale} />;
  }

  const pageRef =
    decodedSegments[0] === "home" || decodedSegments.length === 0
      ? SYNTHETIC_REFS.home
      : `page:${page.id}`;

  return (
    <>
      <TrackPage pageRef={pageRef} locale={locale} enabled={!draft} />
      <Header data={page.header as HeaderType} />
      <main>
        <div>
          <BreadcrumbsJsonLd items={page.breadcrumbs} locale={locale} />

          <PayloadRedirects disableNotFound url={url} locale={locale} />

          {/* getPageBySlug's declared return type marks `id` optional (it is
              Payload's write-side type), but a resolved document always has
              one - the same assumption line 46 above already makes. */}
          <Breadcrumbs pageId={page.id!} locale={locale} />

          <RenderBlocks blocks={page.blocks} />

          <ChildPages pageId={page.id!} locale={locale} />
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

// getPageBySlug reads draftMode(), so a static regeneration of these routes throws
// DYNAMIC_SERVER_USAGE the moment the database has content. The sandbox serves three
// people on one call, so rendering per request costs nothing worth keeping.
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return await getMainSitePageStaticParams();
}
