/**
 * The talk page - the one screen the call is built around. Modelled on the existing
 * app/(frontend)/[locale]/blog/[slug] route.
 *
 * The order of what follows is the argument, not a layout preference:
 *
 *   title -> summary -> "questions this talk answers" -> takeaways -> audio -> pull quotes
 *   -> body -> transcript
 *
 * Everything above `audio` is visible at every tier and is what a crawler or an answer engine
 * reads. AI visibility driving people to a paywall landing page - this is that page,
 * with the derived layer public and the archive material gated.
 *
 * Route placement note: this sits under [locale] because proxy.ts rewrites every top-level path
 * except api|admin|_next|_vercel into the locale catch-all. A route at /talks/[slug] outside
 * [locale] would build, appear in the route table, and 404 in production.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RichText } from "@/components/shared";
import { getPayloadClient, getTalkBySlug } from "@/dal";
import { getSiteSettings } from "@/dal/getSiteSettings";
import { BreadcrumbsJsonLd, TalkJsonLd } from "@/components/seo/components";
import { ViewAsSwitch } from "@/components/ViewAsSwitch";
import { applyTier } from "@/lib/talks/applyTier";
import { TALK_GATED_REGION_CLASS } from "@/lib/talks/gatedRegion";
import { getReaderTier } from "@/lib/talks/getReaderTier";
import type { Locale } from "@/lib/types";
import { generateMeta } from "@/lib/utils/generateMeta";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Footer as FooterType, Header as HeaderType, Talk, Topic } from "@/payload-types";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

/**
 * `topics` is (number | Topic)[] - a relationship comes back as an id when the query depth did not
 * reach it, so the objects have to be picked out rather than assumed.
 */
const resolveTopics = (topics: Talk["topics"]): Topic[] =>
  (Array.isArray(topics) ? topics : []).filter(
    (topic): topic is Topic => typeof topic === "object" && topic !== null
  );

const formatTimestamp = (totalSeconds?: number | null) => {
  const seconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

/**
 * SEO metadata is built from the UNGATED document on purpose. A gated talk still needs a real
 * title and description in the HTML, because being findable is the point of the engagement - and
 * their current Magento already behaves this way.
 *
 * Routed through generateMeta() - the same helper the Page catch-all and the blog route use - so
 * canonical, robots, the whole og:* set and the whole twitter:* set come out identical to a Page.
 * The route used to hand-roll a two-field object, which is why the SEO tab's stored image and
 * robots choice never reached the page.
 *
 * The description fallback chain is preserved by resolving it INTO the doc handed to the helper.
 * generateMeta's own chain then continues from there into the site-level default, so
 * meta.description -> AI summary -> teaser -> site default holds end to end. That chain is a
 * selling point: an item with no hand-written description still ships a real one.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const payload = await getPayloadClient();
  const talk = await getTalkBySlug(payload, slug, locale);
  if (!talk) return {};

  return generateMeta({
    collection: "talk",
    doc: {
      ...talk,
      meta: {
        ...talk.meta,
        description: talk.meta?.description ?? talk.aiSummary ?? talk.teaser ?? undefined,
      },
    },
    locale,
  });
}

export default async function TalkPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const payload = await getPayloadClient();

  const document = await getTalkBySlug(payload, slug, locale);
  if (!document) notFound();

  const readerTier = await getReaderTier();
  const { isLocked, requiredTier, talk } = applyTier(document, readerTier);
  const siteSettings = await getSiteSettings({ locale });

  const topics = resolveTopics(talk.topics);

  // A talk has no breadcrumb chain of its own, so the trail is built from its primary topic - the
  // one intermediate page that actually exists as a route. There is no /talks index to link to.
  const primaryTopic = topics[0];

  return (
    <div className="flex min-h-screen flex-col">
      <Header data={siteSettings.blog.header as HeaderType} />
      <main className="grow">
        <TalkJsonLd
          locale={locale}
          requiredTier={requiredTier}
          siteName={siteSettings.general?.siteName as string}
          talk={talk}
        />
        <BreadcrumbsJsonLd
          items={[
            ...(primaryTopic
              ? [
                  {
                    label: primaryTopic.title,
                    url: buildUrl({ collection: "topic", locale, slug: primaryTopic.slug }),
                  },
                ]
              : []),
            {
              label: talk.title,
              url: buildUrl({ collection: "talk", locale, slug: talk.slug }),
            },
          ]}
          locale={locale}
        />
        <article style={{ margin: "0 auto", maxWidth: 760, padding: "40px 20px 120px" }}>
          <p style={{ color: "#888", fontSize: 12, textTransform: "uppercase" }}>
            {String(talk.kind ?? "").replace(/-/gu, " ")}
            {talk.durationSeconds ? ` · ${Math.round(Number(talk.durationSeconds) / 60)} min` : ""}
          </p>
          <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: "0 0 12px" }}>{talk.title}</h1>

          {topics.length ? (
            <ul
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                listStyle: "none",
                margin: "0 0 24px",
                padding: 0,
              }}
            >
              {topics.map((topic) => (
                <li key={topic.slug}>
                  <a
                    href={`/browse-topics/${topic.slug}`}
                    style={{
                      border: "1px solid #d4d4d4",
                      borderRadius: 999,
                      color: "#111",
                      fontSize: 12,
                      padding: "3px 10px",
                      textDecoration: "none",
                    }}
                  >
                    {topic.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          {talk.aiSummary ? (
            <section
              style={{ background: "#f7f7f7", borderRadius: 8, marginBottom: 24, padding: 20 }}
            >
              <h2
                style={{
                  fontSize: 13,
                  letterSpacing: 0.4,
                  margin: "0 0 8px",
                  textTransform: "uppercase",
                }}
              >
                Summary
              </h2>
              <p style={{ margin: 0 }}>{talk.aiSummary as string}</p>
            </section>
          ) : null}

          {Array.isArray(talk.aiQuestions) && talk.aiQuestions.length ? (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18 }}>Questions this talk answers</h2>
              <ul>
                {(talk.aiQuestions as { question: string }[]).map((entry) => (
                  <li key={entry.question} style={{ marginBottom: 4 }}>
                    {entry.question}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {Array.isArray(talk.aiTakeaways) && talk.aiTakeaways.length ? (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18 }}>Key takeaways</h2>
              <ul>
                {(talk.aiTakeaways as { takeaway: string }[]).map((entry) => (
                  <li key={entry.takeaway} style={{ marginBottom: 6 }}>
                    {entry.takeaway}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {talk.audioUrl ? (
            <section style={{ marginBottom: 24 }}>
              {/* Streams straight from the foundation's own S3 bucket - public-read, no signature. */}
              <audio
                controls
                preload="metadata"
                src={talk.audioUrl as string}
                style={{ width: "100%" }}
              >
                <track kind="captions" />
              </audio>
            </section>
          ) : null}

          {Array.isArray(talk.aiPullQuotes) && talk.aiPullQuotes.length && talk.audioUrl ? (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18 }}>Moments</h2>
              {(talk.aiPullQuotes as { quote: string; startSeconds?: number | null }[]).map(
                (pullQuote) => (
                  <blockquote
                    key={pullQuote.quote}
                    style={{ borderLeft: "3px solid #111", margin: "0 0 14px", paddingLeft: 14 }}
                  >
                    <p style={{ margin: "0 0 4px" }}>&ldquo;{pullQuote.quote}&rdquo;</p>
                    {/* #t= is a media fragment, so the browser seeks without any JavaScript. The number
                      is derived from the transcript segments, never generated - see derive-ai.mjs. */}
                    <a
                      href={`${talk.audioUrl as string}#t=${Math.floor(pullQuote.startSeconds ?? 0)}`}
                      style={{ color: "#666", fontSize: 12 }}
                    >
                      Listen at {formatTimestamp(pullQuote.startSeconds)}
                    </a>
                  </blockquote>
                )
              )}
            </section>
          ) : null}

          {/* The region the paywall governs, and the one the JSON-LD hasPart names by class. It
              wraps BOTH branches on purpose: Google matches the selector against the rendered
              page, so the element has to be there whether the body or the upsell is inside it. */}
          <div className={TALK_GATED_REGION_CLASS}>
            {isLocked ? (
              <section style={{ border: "1px solid #e8c97a", borderRadius: 8, padding: 24 }}>
                <h2 style={{ fontSize: 18, marginTop: 0 }}>The rest of this talk is for members</h2>
                <p style={{ color: "#555" }}>
                  {talk.teaser ?? "This item is part of the members' archive."}
                </p>
                <p style={{ fontSize: 13 }}>
                  Needs{" "}
                  <strong>{requiredTier === "visitor" ? "no membership" : requiredTier}</strong>.
                  You are viewing as <strong>{readerTier}</strong> - use the switch to change it.
                </p>
              </section>
            ) : (
              <>
                <section style={{ lineHeight: 1.65 }}>
                  {/* `body` is a richText field, so it arrives as a Lexical document, not a string.
                      Interpolating it rendered the literal text "[object Object]" on every unlocked
                      item - and no check caught it, because the paywall tests only asserted that the
                      locked notice was ABSENT, never that the prose was present. */}
                  {talk.body ? <RichText content={talk.body} variant="content" /> : null}
                </section>

                {talk.transcript ? (
                  <details style={{ marginTop: 32 }}>
                    <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
                      Full transcript
                    </summary>
                    <p style={{ color: "#333", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {talk.transcript as string}
                    </p>
                  </details>
                ) : null}
              </>
            )}
          </div>

          <ViewAsSwitch current={readerTier} />
        </article>
      </main>
      <Footer data={siteSettings.blog.footer as FooterType} />
    </div>
  );
}
