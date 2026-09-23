import { setRequestLocale } from "next-intl/server";
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
import { getListingDetailStaticParams, resolveListingDetail } from "@/dal/getListingRoutes";
import { InsightDetail, PersonDetail } from "@/components/demo/articles/detailViews";
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
  setRequestLocale(locale);
  const { decodedSegments, url } = parseSlugToPath(slug);

  if (decodedSegments[0] === "home") {
    return redirect({ href: `/${decodedSegments.slice(1).join("/")}`, locale });
  }

  const page = await getPageBySlug(decodedSegments, locale);
  const { isEnabled: draft } = await draftMode();

  if (!page) {
    // Articles and people have no page documents; their addresses sit under the listing page.
    const detail = await resolveListingDetail(decodedSegments, locale);
    const listingPage = detail ? await getPageBySlug(decodedSegments.slice(0, -1), locale) : null;
    if (detail && listingPage) {
      return (
        <>
          <Header data={listingPage.header as HeaderType} />
          <main>
            <Breadcrumbs
              pageId={listingPage.id!}
              locale={locale}
              currentLabel={detail.kind === "insight" ? detail.insight.title : detail.person.name}
            />
            {detail.kind === "insight" ? (
              <InsightDetail insight={detail.insight} locale={locale} />
            ) : (
              <PersonDetail person={detail.person} locale={locale} />
            )}
          </main>
          <Footer data={listingPage.footer as FooterType} />
        </>
      );
    }
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
    const detail = await resolveListingDetail(decodedSegments, locale);
    if (!detail) return generateNotFoundMeta({ locale });
    const title = detail.kind === "insight" ? detail.insight.title : detail.person.name;
    const description =
      detail.kind === "insight"
        ? (detail.insight.standfirst ?? undefined)
        : [detail.person.jobTitle, detail.person.office].filter(Boolean).join(" · ") || undefined;
    // hreflang only for languages this article really exists in; the language switcher reads
    // these links to decide which languages to offer.
    return {
      title: `${title} | Marks & Clerk`,
      description,
      robots: { index: false, follow: false },
      alternates: { languages: detail.alternates },
    };
  }

  return generateMeta({
    collection: "page",
    doc: page,
    locale,
  });
}

// Statically generated at build, then regenerated on demand: page saves and the demo seed call
// revalidatePath. The hourly revalidate is only a backstop for an article or person edit, which
// does not revalidate the listing pages that show them.
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [...(await getMainSitePageStaticParams()), ...(await getListingDetailStaticParams())];
}
