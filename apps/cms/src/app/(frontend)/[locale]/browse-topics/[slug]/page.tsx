/**
 * The topic page. A topic is a collection item, so it renders from this route and needs no Page
 * document - one Page per topic would make the editor maintain a document whose only content is a
 * query, and it would drift the moment an item was retagged.
 *
 * This is the landing page the topic chips point at, from the homepage and from every item page,
 * so the route existing is what keeps those links alive. The path is /browse-topics/[slug], which
 * is the segment the client's live site already uses.
 *
 * Route placement note: this sits under [locale] because proxy.ts rewrites every top-level path
 * except api|admin|_next|_vercel into the locale catch-all. A route at /browse-topics/[slug]
 * outside [locale] would build, appear in the route table, and 404 in production.
 *
 * No generateStaticParams, matching the sibling /talks/[slug] route: both render on demand and
 * cache at the DAL, so a newly published item or topic is reachable without a rebuild.
 */

import Link from "next/link";
import { notFound } from "next/navigation";

import { getPayloadClient, getTalks } from "@/dal";
// Deep import: the "@/dal" barrel does not re-export this one yet. Switch to the barrel once it
// does, so application code keeps a single DAL entry point.
import { getTopicBySlug } from "@/dal/getTopicBySlug";
import { getSiteSettings } from "@/dal/getSiteSettings";
import type { Locale } from "@/lib/types";
import type { Footer as FooterType, Header as HeaderType } from "@/payload-types";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

/** A topic page lists its whole topic, so the listing default of 6 would silently truncate it. */
const MAX_ITEMS_LISTED = 100;

const TIER_LABELS: Record<string, string> = {
  "all-access": "All Access",
  basic: "Basic",
  premium: "Premium",
  visitor: "Free",
};

const formatKind = (kind?: string | null) =>
  kind ? kind.replace(/-/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()) : null;

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale, slug } = await params;
  const payload = await getPayloadClient();
  const topic = await getTopicBySlug(payload, slug, locale);
  if (!topic) return {};

  return {
    description: topic.meta?.description ?? topic.description ?? undefined,
    title: topic.meta?.title ?? topic.title,
  };
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
      <main
        className="grow"
        style={{ margin: "0 auto", maxWidth: 760, padding: "40px 20px 120px" }}
      >
        <p style={{ color: "#888", fontSize: 12, textTransform: "uppercase" }}>Topic</p>
        <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: "0 0 12px" }}>{topic.title}</h1>

        {topic.description ? (
          <p style={{ color: "#555", fontSize: 16, lineHeight: 1.6, margin: "0 0 28px" }}>
            {topic.description}
          </p>
        ) : null}

        <h2 style={{ fontSize: 20, margin: "0 0 4px" }}>
          {docs.length === 1 ? "1 item" : `${docs.length} items`} on this topic
        </h2>

        {docs.length ? (
          <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0 }}>
            {docs.map((talk) => {
              const duration = formatDuration(talk.durationSeconds);
              const requiredTier = talk.requiredTier ?? "visitor";

              return (
                <li
                  key={talk.id}
                  style={{
                    borderBottom: "1px solid #e0e0e0",
                    padding: "14px 0",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                    {talk.kind ? (
                      <span
                        style={{
                          background: "#f0f0f0",
                          borderRadius: 3,
                          fontSize: 11,
                          padding: "2px 6px",
                        }}
                      >
                        {formatKind(talk.kind)}
                      </span>
                    ) : null}
                    {/* The tier the ITEM requires, not what the reader holds. A gated item is listed
                        and indexed here in full - the gate belongs on the body, which is where
                        applyTier() puts it. Stating the requirement instead of the reader's state
                        also keeps this page free of per-reader cookies, so it caches for everyone. */}
                    <span
                      style={{
                        background: requiredTier === "visitor" ? "#eaf6ea" : "#fdf0d5",
                        borderRadius: 3,
                        fontSize: 11,
                        padding: "2px 6px",
                      }}
                    >
                      {TIER_LABELS[requiredTier]}
                    </span>
                    {duration ? (
                      <span style={{ color: "#888", fontSize: 11 }}>{duration}</span>
                    ) : null}
                    {talk.audioUrl ? (
                      <span style={{ color: "#888", fontSize: 11 }}>audio</span>
                    ) : null}
                  </div>

                  <h3 style={{ fontSize: 16, lineHeight: 1.35, margin: "0 0 6px" }}>
                    <Link href={`/talks/${talk.slug}`} style={{ color: "#111" }}>
                      {talk.title}
                    </Link>
                  </h3>

                  {talk.teaser ? (
                    <p style={{ color: "#555", fontSize: 13, margin: 0 }}>
                      {talk.teaser.slice(0, 200)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p style={{ color: "#888", fontSize: 14 }}>Nothing is published under this topic yet.</p>
        )}
      </main>
      <Footer data={siteSettings.blog.footer as FooterType} />
    </div>
  );
}
