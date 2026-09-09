/**
 * The talk page - the one screen the call is built around. Modelled on the existing
 * app/(frontend)/[locale]/blog/[slug] route, and now typeset like it: a hero band in the site
 * container, then one 720px reading column - the blog article's own measure - then the app's type
 * scale rather than pixel values written here. Nothing on this page sets a colour or a font size
 * of its own.
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

import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { RichText } from "@/components/shared";
import { getPayloadClient, getTalkBySlug } from "@/dal";
import { getSiteSettings } from "@/dal/getSiteSettings";
import { BreadcrumbsJsonLd, TalkJsonLd } from "@/components/seo/components";
import { AudioSeekButton } from "@/components/AudioSeekButton";
import { DisplayHeading } from "@/components/DisplayHeading";
import { ViewAsSwitch } from "@/components/ViewAsSwitch";
import { cn } from "@/components/utils";
import { applyTier } from "@/lib/talks/applyTier";
import { excerptAtWord, formatTalkDuration, formatTalkKind } from "@/lib/talks/display";
import { TALK_GATED_REGION_CLASS } from "@/lib/talks/gatedRegion";
import { getReaderTier } from "@/lib/talks/getReaderTier";
import { tierLabel } from "@/lib/talks/tierLabels";
import type { Locale } from "@/lib/types";
import { generateMeta } from "@/lib/utils/generateMeta";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Footer as FooterType, Header as HeaderType, Talk, Topic } from "@/payload-types";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";
// The chip a topic link is, shared with the homepage block so the same link is not drawn two ways.
import { TopicChipList } from "@/blocks/TopicChips/ui";

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
 * The "Moments" buttons seek this element, so it needs an id that is ours rather than a tag
 * selector - a second player added to the page later would otherwise be seeked instead.
 */
const AUDIO_ELEMENT_ID = "talk-audio";

/**
 * The locked notice shows a fragment, not the field. The teaser is 300 characters and the hero
 * talk's whole body is 377, so printing the teaser in full showed a paywalled item almost
 * entirely, and it read as a leak rather than as an invitation. A visible teaser is the point of
 * the indexable-teaser pattern; the proportion is the part that was wrong. The `teaser` field
 * itself is untouched - this is a rendering budget, not a content change.
 */
const LOCKED_NOTICE_EXCERPT_CHARS = 140;

/** Every section on this page carries the same heading, so they cannot drift apart again. */
function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-h-card text-foreground">{children}</h2>;
}

/**
 * The derived lists. `list-disc` is explicit because the app's CSS reset removes markers from every
 * `ul`, which turned six questions into one run of sentences.
 */
function DerivedList({ items }: { items: string[] }) {
  return (
    <ul className="text-body-lg list-disc space-y-2.5 pl-6 text-muted-foreground marker:text-primary">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

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

  const heroMeta = [formatTalkKind(talk.kind), formatTalkDuration(talk.durationSeconds)]
    .filter((entry) => entry !== null)
    .join(" · ");

  const questions = (talk.aiQuestions ?? []).map((entry) => entry.question);
  const takeaways = (talk.aiTakeaways ?? []).map((entry) => entry.takeaway);
  const pullQuotes = talk.aiPullQuotes ?? [];

  // Both labels come from the one module, so the notice cannot name a tier differently from the
  // listings or from the switch it sits next to.
  const requiredTierLabel = tierLabel(requiredTier);
  const readerTierLabel = tierLabel(readerTier);
  const lockedExcerpt = excerptAtWord(talk.teaser, LOCKED_NOTICE_EXCERPT_CHARS);

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
        <article>
          {/* The band and its bottom border are the separator the header needs, and the padding is
              PostHero's. The reading column is centred inside the site container rather than
              inside the viewport, so it lines up with the blog article route. */}
          <header className="border-b border-border bg-surface-muted pb-[clamp(28px,4vw,44px)] pt-[clamp(40px,6vw,72px)]">
            <div className="mx-auto w-full max-w-containerMaxW px-containerBase">
              <div className="mx-auto flex max-w-[720px] flex-col gap-6">
                {heroMeta && <p className="text-eyebrow text-muted-foreground">{heroMeta}</p>}
                <DisplayHeading as="h1" size="display-2" text={talk.title} />
                <TopicChipList topics={topics} />
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-containerMaxW px-containerBase py-sectionBase">
            <div className="mx-auto flex max-w-[720px] flex-col gap-14">
              {talk.aiSummary && (
                <section className="flex flex-col gap-4">
                  <SectionHeading>Summary</SectionHeading>
                  <p className="text-lead text-muted-foreground">{talk.aiSummary}</p>
                </section>
              )}

              {questions.length > 0 && (
                <section className="flex flex-col gap-5">
                  <SectionHeading>Questions this talk answers</SectionHeading>
                  <DerivedList items={questions} />
                </section>
              )}

              {takeaways.length > 0 && (
                <section className="flex flex-col gap-5">
                  <SectionHeading>Key takeaways</SectionHeading>
                  <DerivedList items={takeaways} />
                </section>
              )}

              {talk.audioUrl && (
                <section>
                  {/* A frame around the browser's own controls, not a player of our own: a custom
                      player is a week of keyboard and buffering work that this call does not need.
                      Streams straight from the client's own S3 bucket - public-read, no signature. */}
                  <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6">
                    <p className="text-eyebrow text-muted-foreground">Listen</p>
                    <audio
                      className="w-full"
                      controls
                      id={AUDIO_ELEMENT_ID}
                      preload="metadata"
                      src={talk.audioUrl}
                    >
                      <track kind="captions" />
                    </audio>
                  </div>
                </section>
              )}

              {pullQuotes.length > 0 && talk.audioUrl && (
                <section className="flex flex-col gap-6">
                  <SectionHeading>Moments</SectionHeading>
                  <div className="flex flex-col gap-8">
                    {pullQuotes.map((pullQuote) => (
                      <blockquote
                        className="flex flex-col items-start gap-3 border-l-[3px] border-primary pl-7"
                        key={pullQuote.quote}
                      >
                        <p className="text-lead font-display text-foreground/80 italic">
                          &ldquo;{pullQuote.quote}&rdquo;
                        </p>
                        {/* Seeking the player in place needs JavaScript - see AudioSeekButton for
                          why a media fragment cannot do it. The number is derived from the
                          transcript segments, never generated - see derive-ai.mjs. */}
                        <AudioSeekButton
                          audioElementId={AUDIO_ELEMENT_ID}
                          startSeconds={Math.floor(pullQuote.startSeconds ?? 0)}
                          timestampLabel={formatTimestamp(pullQuote.startSeconds)}
                        />
                      </blockquote>
                    ))}
                  </div>
                </section>
              )}

              {/* The region the paywall governs, and the one the JSON-LD hasPart names by class. It
                  wraps BOTH branches on purpose: Google matches the selector against the rendered
                  page, so the element has to be there whether the body or the upsell is inside it. */}
              <div className={cn(TALK_GATED_REGION_CLASS, "flex flex-col gap-14")}>
                {isLocked ? (
                  <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-8">
                    <h2 className="text-h-card flex items-start gap-3 text-foreground">
                      <Lock aria-hidden className="mt-1 shrink-0 text-primary" size={20} />
                      The rest of this talk is for {requiredTierLabel} members
                    </h2>
                    {lockedExcerpt && (
                      <p className="text-lead text-muted-foreground">{lockedExcerpt}</p>
                    )}
                    <p className="text-body-lg text-muted-foreground">
                      {requiredTierLabel} membership opens the full talk, its audio and its
                      transcript.
                    </p>
                    {/* The reader's own position, as a caption rather than as the complaint it used
                        to be ("You are viewing as visitor - use the switch to change it"). */}
                    <p className="text-eyebrow text-muted-foreground">
                      Viewing as {readerTierLabel}
                    </p>
                  </section>
                ) : (
                  <>
                    <section>
                      {/* `body` is a richText field, so it arrives as a Lexical document, not a
                          string. Interpolating it rendered the literal text "[object Object]" on
                          every unlocked item - and no check caught it, because the paywall tests
                          only asserted that the locked notice was ABSENT, never that the prose was
                          present.

                          No `variant`, matching the blog article route: the default `prose` is the
                          reading treatment (foreground copy, display-serif headings, the system
                          blockquote). `variant="content"` is the muted in-a-section treatment and
                          rendered the whole body in muted-foreground grey. */}
                      {talk.body && <RichText content={talk.body} />}
                    </section>

                    {talk.transcript && (
                      <details className="rounded-lg border border-border bg-surface px-6 py-5">
                        <summary className="text-h-card cursor-pointer text-foreground marker:text-primary">
                          Full transcript
                        </summary>
                        <p className="text-body-lg mt-5 whitespace-pre-wrap text-muted-foreground">
                          {talk.transcript}
                        </p>
                      </details>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Fixed-position, so it is out of flow and its place in the markup is not a layout
              decision. Left outside the reading column for that reason. */}
          <ViewAsSwitch current={readerTier} />
        </article>
      </main>
      <Footer data={siteSettings.blog.footer as FooterType} />
    </div>
  );
}
