import { TrackPage } from "@focus-reactive/payload-plugin-analytics/client";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { Suspense } from "react";

import { SYNTHETIC_REFS } from "@/lib/plugins/analytics/SYNTHETIC_REFS";
import type { Locale } from "@/lib/types";
import { getSiteSettings } from "@/dal/getSiteSettings";
import type { Footer as FooterType, Header as HeaderType } from "@/payload-types";
import { Footer, Header } from "@/widgets";

import { SearchInput } from "./_components/SearchInput";
import { SearchResults } from "./_components/SearchResults";

interface Args {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ query?: string }>;
}

export default async function SearchPage({ params, searchParams }: Args) {
  const [{ locale }, { query: rawQuery }] = await Promise.all([params, searchParams]);
  const query = rawQuery && decodeURIComponent(rawQuery);
  const { isEnabled: draft } = await draftMode();
  const siteSettings = await getSiteSettings({ locale });

  return (
    <div className="flex min-h-screen flex-col">
      <TrackPage pageRef={SYNTHETIC_REFS.search} locale={locale} enabled={!draft} />
      <Header data={siteSettings.header as HeaderType} />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <SearchInput defaultValue={query ?? ""} />

          <Suspense fallback={null}>
            <SearchResults query={query} locale={locale} />
          </Suspense>
        </div>
      </main>
      <Footer data={siteSettings.footer as FooterType} />
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Search",
  };
}
