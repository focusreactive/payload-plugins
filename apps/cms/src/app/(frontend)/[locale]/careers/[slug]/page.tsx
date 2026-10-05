import type { Metadata } from "next";
import React from "react";

import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";
import { PayloadRedirects } from "@/components/PayloadRedirects";
import { getSiteSettings } from "@/dal/getSiteSettings";
import { getVacancyBySlug } from "@/dal/getVacancyBySlug";
import { getVacancyStaticParams } from "@/dal/staticParams/vacancies";
import type { Locale } from "@/lib/types";
import { generateMeta } from "@/lib/utils/generateMeta";
import { generateNotFoundMeta } from "@/lib/utils/generateNotFoundMeta";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Footer as FooterType, Header as HeaderType } from "@/payload-types";

import { VacancyContent } from "./_components/VacancyContent";

interface Args {
  params: Promise<{ slug?: string; locale: Locale }>;
}

export default async function Page({ params }: Args) {
  const { slug = "", locale } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const url = buildUrl({ collection: "vacancies", locale, slug: decodedSlug });

  const [vacancy, siteSettings] = await Promise.all([
    getVacancyBySlug({ locale, slug: decodedSlug }),
    getSiteSettings({ locale }),
  ]);

  if (!vacancy) {
    return <PayloadRedirects url={url} locale={locale} />;
  }

  return (
    <>
      <Header data={siteSettings.blog.header as HeaderType} />
      <main id="main" tabIndex={-1} className="outline-none">
        <PayloadRedirects disableNotFound url={url} locale={locale} />
        <VacancyContent vacancy={vacancy} locale={locale} />
      </main>
      <Footer data={siteSettings.blog.footer as FooterType} />
    </>
  );
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug = "", locale } = await params;
  const vacancy = await getVacancyBySlug({ locale, slug: decodeURIComponent(slug) });

  if (!vacancy) {
    return generateNotFoundMeta({ locale });
  }

  return generateMeta({
    collection: "vacancies",
    doc: {
      ...vacancy,
      meta: { ...vacancy.meta, description: vacancy.meta?.description || vacancy.summary },
    },
    locale,
  });
}

export async function generateStaticParams() {
  return getVacancyStaticParams();
}
