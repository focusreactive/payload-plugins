import { TrackPage } from "@focus-reactive/payload-plugin-analytics/client";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { Suspense } from "react";

import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";
import { DisplayHeading } from "@/components/DisplayHeading";
import { SectionMarker } from "@/components/ui/SectionMarker";
import { getSiteSettings } from "@/dal/getSiteSettings";
import { SEARCH_CONFIG } from "@/lib/config/talks";
import { SYNTHETIC_REFS } from "@/lib/plugins/analytics/SYNTHETIC_REFS";
import type { Locale } from "@/lib/types";
import type { Footer as FooterType, Header as HeaderType } from "@/payload-types";

import { SearchInput } from "./_components/SearchInput";
import { SearchResults } from "./_components/SearchResults";

interface Args {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

/**
 * The copy says "describe what you are going through" rather than "search" on purpose: this is a
 * vector search over meaning, so a phrase beats a keyword, and a reader typing one word into a box
 * labelled Search will conclude the search is bad when it is the prompt that was wrong.
 */
const PROMPT = "Describe what you're going through";

export default async function SearchPage({ params, searchParams }: Args) {
  const [{ locale }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const rawQuery = resolvedSearchParams[SEARCH_CONFIG.queryParam];
  const query = rawQuery && decodeURIComponent(rawQuery);
  const { isEnabled: draft } = await draftMode();
  const siteSettings = await getSiteSettings({ locale });

  return (
    <div className="flex min-h-screen flex-col">
      <TrackPage enabled={!draft} locale={locale} pageRef={SYNTHETIC_REFS.search} />
      <Header data={siteSettings.blog.header as HeaderType} />

      <main className="grow">
        <div className="mx-auto w-full max-w-[860px] px-[clamp(16px,2.5vw,40px)] py-[clamp(48px,5vw,88px)]">
          <SectionMarker>Search the library</SectionMarker>

          <DisplayHeading
            as="h1"
            className="mt-[clamp(10px,1.2vw,18px)] mb-[clamp(24px,2.6vw,40px)] max-w-[18ch]"
            size="display-2"
            text={PROMPT}
          />

          <SearchInput
            defaultValue={query ?? ""}
            placeholder="I keep losing my temper with people I love"
          />

          {query ? null : (
            <p className="mt-[clamp(16px,1.8vw,26px)] text-body text-muted-foreground">
              This searches meaning rather than words, so a whole sentence finds more than a single
              term does.
            </p>
          )}

          <Suspense fallback={null} key={query}>
            <SearchResults locale={locale} query={query} />
          </Suspense>
        </div>
      </main>

      <Footer data={siteSettings.blog.footer as FooterType} />
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    // noindex because the page has no content of its own and every query is a separate URL.
    robots: { follow: true, index: false },
    title: "Search the library",
  };
}
