/**
 * The topic page. A topic is a collection item, so it renders from this route and needs no Page
 * document - one Page per topic would make the editor maintain a document whose only content is a
 * query, and it would drift the moment an item was retagged.
 *
 * This is the landing page the topic chips point at, from the homepage and from every item page,
 * so the route existing is what keeps those links alive. The path is /browse-topics/[slug], which
 * is the segment the client's live site already uses.
 *
 * It is a LISTING, not a reading page, so it sits in the same measure every other listing sits in:
 * max-w-containerMaxW with px-containerBase, which is the column the header logo aligns to. The
 * first version borrowed the blog article's 720px reading column, and the content jumped about
 * 165px sideways when a visitor clicked from /browse-topics into a topic.
 *
 * Route placement note: this sits under [locale] because proxy.ts rewrites every top-level path
 * except api|admin|_next|_vercel into the locale catch-all. A route at /browse-topics/[slug]
 * outside [locale] would build, appear in the route table, and 404 in production.
 *
 * No generateStaticParams, matching the sibling /talks/[slug] route: both render on demand and
 * cache at the DAL, so a newly published item or topic is reachable without a rebuild.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BreadcrumbsJsonLd } from "@/components/seo/components";
import { DisplayHeading } from "@/components/DisplayHeading";
import { getPayloadClient, getTalks } from "@/dal";
import { getSiteSettings } from "@/dal/getSiteSettings";
// Deep import: the "@/dal" barrel does not re-export this one yet. Switch to the barrel once it
// does, so application code keeps a single DAL entry point.
import { getTopicBySlug } from "@/dal/getTopicBySlug";
import type { Locale } from "@/lib/types";
import { generateMeta } from "@/lib/utils/generateMeta";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Footer as FooterType, Header as HeaderType } from "@/payload-types";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";
// The same card the TalkGrid block renders. Sharing it is what keeps the tier label, the lock and
// the teaser cut identical on two pages that are walked one after the other.
import { TalkList } from "@/blocks/TalkGrid/ui";

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

/** A topic page lists its whole topic, so the listing default of 6 would silently truncate it. */
const MAX_ITEMS_LISTED = 100;

/**
 * Same shared helper as the Page catch-all and the blog route, so a topic page ships the canonical,
 * robots, og:* and twitter:* set a Page ships. The route used to return a title and a description
 * and nothing else, which left the SEO tab's stored meta image and robots choice unread.
 *
 * The topic-level fallback (meta.description -> the topic's own description) is resolved into the
 * doc rather than lost, exactly as the sibling talk route does it; generateMeta continues from
 * there into the site-level default.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const payload = await getPayloadClient();
  const topic = await getTopicBySlug(payload, slug, locale);
  if (!topic) return {};

  return generateMeta({
    collection: "topic",
    doc: {
      ...topic,
      meta: {
        ...topic.meta,
        description: topic.meta?.description ?? topic.description ?? undefined,
      },
    },
    locale,
  });
}

export default async function TopicPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const payload = await getPayloadClient();

  const topic = await getTopicBySlug(payload, slug, locale);
  if (!topic) notFound();

  const siteSettings = await getSiteSettings({ locale });

  // The same DAL the TalkGrid block uses, filtered by this topic's slug - one query shape for
  // "items carrying a topic", so a change to the listing select or sort reaches both.
  const { docs } = await getTalks(payload, {
    limit: MAX_ITEMS_LISTED,
    locale,
    topicSlug: topic.slug,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header data={siteSettings.blog.header as HeaderType} />
      <main className="grow">
        {/* Breadcrumbs only, on purpose. The one listing schema this repo owns, createBlogSchema,
            is typed to Post and resolves every URL through the blog base path, so it cannot
            describe a topic; an ItemList written here would be new markup invented for one page
            rather than a shared component, so it waits for a reason to exist. */}
        <BreadcrumbsJsonLd
          items={[
            {
              label: topic.title,
              url: buildUrl({ collection: "topic", locale, slug: topic.slug }),
            },
          ]}
          locale={locale}
        />

        {/* The band and its bottom border are the separator the header needs. Without one the
            header floated over the page with nothing under it. Padding matches PostHero. */}
        <header className="border-b border-border bg-surface-muted pb-[clamp(28px,4vw,44px)] pt-[clamp(40px,6vw,72px)]">
          <div className="mx-auto w-full max-w-containerMaxW px-containerBase">
            <div className="flex max-w-[720px] flex-col gap-5">
              <p className="text-eyebrow text-muted-foreground">Topic</p>
              <DisplayHeading as="h1" size="display-2" text={topic.title} />
              {topic.description && (
                <p className="text-lead text-muted-foreground">{topic.description}</p>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-containerMaxW px-containerBase py-sectionBase">
          <div>
            <h2 className="text-h-card mb-12">
              {docs.length === 1 ? "1 item" : `${docs.length} items`} on this topic
            </h2>

            {docs.length > 0 ? (
              <TalkList talks={docs} />
            ) : (
              <p className="text-body-lg text-muted-foreground">
                Nothing is published under this topic yet.
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer data={siteSettings.blog.footer as FooterType} />
    </div>
  );
}
