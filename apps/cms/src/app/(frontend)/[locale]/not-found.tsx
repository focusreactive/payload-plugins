import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import NextLink from "next/link";
import React from "react";

import { generateNotFoundMeta } from "@/lib/utils/generateNotFoundMeta";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";
import { buttonVariants, ButtonVariant } from "@/components/button";
import { getPathname } from "@/lib/i18n/navigation";
import { getNotFoundSettings } from "@/dal/getNotFoundSettings";
import type { Header as HeaderType, Footer as FooterType, Post } from "@/payload-types";
import { toPostsListItem } from "@/blocks/PostsList/Component";
import { PostsList } from "@/blocks/PostsList/ui";
import { getPayloadClient, getPosts } from "@/dal";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";

interface Props {
  params?: Promise<{ locale: Locale }>;
}

export default async function NotFound() {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";

  const segments = pathname.split("/").filter(Boolean);
  const locale = await resolveLocale(segments[0] as Locale | undefined);

  const [settings, t] = await Promise.all([
    getNotFoundSettings({ locale }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const homeHref = getPathname({ href: "/", locale });
  const latestPosts = await getPosts(await getPayloadClient(), { limit: 3, locale }).catch(
    () => null
  );
  const latest = (latestPosts?.docs ?? []).map((post) => toPostsListItem(post as Post, locale));

  return (
    <div className="flex min-h-screen flex-col">
      <Header data={settings.header as HeaderType} disableActive />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {/* §6.8 404: ring mark, one sentence, search box, three latest posts. */}
        <section className="py-sectionBase">
          <div className="mx-auto flex w-full max-w-containerMaxW flex-col items-start gap-6 px-containerBase">
            <svg aria-hidden viewBox="0 0 48 48" className="size-12 text-ct-green-500">
              <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="3" />
              <circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" strokeWidth="3" />
            </svg>
            <h1 className="text-display-2 text-heading">
              {settings.title || "This page moved or never existed"}
            </h1>
            <p className="max-w-[60ch] text-lead text-muted-foreground">
              {settings.description || "Search the site, or start from the home page."}
            </p>
            <form
              action={getPathname({ href: "/search", locale })}
              method="get"
              role="search"
              className="flex w-full max-w-[560px] flex-wrap gap-3"
            >
              <label htmlFor="not-found-search" className="sr-only">
                Search
              </label>
              <input
                id="not-found-search"
                name="query"
                type="search"
                placeholder="Search articles and pages"
                className="ct-input min-w-0 flex-1"
              />
              <button type="submit" className={buttonVariants({ variant: ButtonVariant.Primary })}>
                Search
              </button>
            </form>
            <NextLink href={homeHref} className={buttonVariants({ variant: ButtonVariant.Ghost })}>
              {t("goToHomepage")}
            </NextLink>
          </div>
        </section>
        {latest.length > 0 && (
          <section className="bg-ct-sand py-sectionBase">
            <div className="mx-auto w-full max-w-containerMaxW px-containerBase">
              <h2 className="mb-10 text-h-section text-heading">Latest articles</h2>
              <PostsList items={latest} layout="grid" />
            </div>
          </section>
        )}
      </main>
      <Footer data={settings.footer as FooterType} />
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = params ? await params : undefined;
  const locale = await resolveLocale(resolvedParams?.locale);
  return generateNotFoundMeta({ locale });
}
