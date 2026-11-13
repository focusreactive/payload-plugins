import { TrackPage } from "@focus-reactive/payload-plugin-analytics/client";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import React from "react";

import { RenderSiteBlock, RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { SYNTHETIC_REFS } from "@/lib/plugins/analytics/SYNTHETIC_REFS";
import { generateMeta } from "@/lib/utils/generateMeta";
import { generateNotFoundMeta } from "@/lib/utils/generateNotFoundMeta";
import { parseSlugToPath } from "@/lib/utils/parseSlugToPath";
import { BreadcrumbsJsonLd } from "@/components/seo/components";
import { SitePage } from "@/components/site/layout/SitePage";
import { matchEntityRoute } from "@/lib/config/entityRoutes";
import { filterHiddenBlocks } from "@/lib/fields/section/filterHiddenBlocks";
import type { Locale } from "@/lib/types";
import { getSiteChrome } from "@/dal/entities";
import { getPageBySlug } from "@/dal/getPageBySlug";
import { getMainSitePageStaticParams } from "@/dal/staticParams/pages";
import { PayloadRedirects } from "@/components/PayloadRedirects";
import { redirect } from "@/lib/i18n/navigation";
import type { Page as PageDoc } from "@/payload-types";
import { generateEntityMetadata, renderEntityPage, resolveEntity } from "@/templates";

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

  // A URL under a record prefix (a state, clinic, doctor, treatment or condition) is answered by
  // that record's template; everything else, the prefix's own index included, is a Page.
  const entityMatch = matchEntityRoute(decodedSegments);
  const entity = entityMatch ? await resolveEntity(entityMatch, locale) : null;

  if (entity) {
    return renderEntityPage(entity, locale);
  }

  const page = await getPageBySlug(decodedSegments, locale);
  const { isEnabled: draft } = await draftMode();

  if (!page) {
    return <PayloadRedirects url={url} locale={locale} />;
  }

  const isHome = decodedSegments.length === 0;
  const pageRef = isHome ? SYNTHETIC_REFS.home : `page:${page.id}`;
  const chrome = await getSiteChrome(locale);
  const header = page.header && typeof page.header === "object" ? page.header : chrome.header;
  const footer = page.footer && typeof page.footer === "object" ? page.footer : chrome.footer;
  const [hero] = filterHiddenBlocks(page.hero);
  const context = { collection: "page", doc: page as PageDoc } as const;

  return (
    <SitePage
      bodyId={isHome ? "home" : page.slug}
      footer={footer}
      header={header}
      hero={hero ? <RenderSiteBlock block={hero} context={context} locale={locale} /> : null}
      locale={locale}
      path={isHome ? "/" : `/${decodedSegments.join("/")}`}
      template={isHome ? "home" : "default"}
    >
      <TrackPage pageRef={pageRef} locale={locale} enabled={!draft} />
      <BreadcrumbsJsonLd items={page.breadcrumbs} locale={locale} />
      <PayloadRedirects disableNotFound url={url} locale={locale} />
      <RenderSiteBlocks blocks={page.blocks} context={context} locale={locale} />
    </SitePage>
  );
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug = [], locale } = await params;
  const { decodedSegments } = parseSlugToPath(slug);

  const entityMatch = matchEntityRoute(decodedSegments);
  const entity = entityMatch ? await resolveEntity(entityMatch, locale) : null;

  if (entity) {
    return generateEntityMetadata(entity, locale);
  }

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
