import { getServerSideURL } from "@/lib/utils/getURL";
import { TALK_GATED_REGION_CLASS } from "@/lib/talks/gatedRegion";
import type { TalkTier } from "@/lib/talks/applyTier";
import type { Locale } from "@/lib/types";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Media, Talk, Topic } from "@/payload-types";

interface TalkSchemaParams {
  /**
   * The talk AFTER applyTier(). `audioUrl` is therefore absent for a reader who has not reached
   * the tier, and the AudioObject then carries a duration but no contentUrl - correct, because
   * JSON-LD is published to the browser exactly like any other markup, so a contentUrl here would
   * hand the paid stream to anyone who read the page source.
   */
  talk: Talk;
  requiredTier: TalkTier;
  siteName?: string;
  locale: Locale;
}

/** MIME types for the formats an archive of spoken audio actually ships. */
const AUDIO_MIME_TYPES: Record<string, string> = {
  aac: "audio/aac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
};

const getAudioMimeType = (url: string): string | undefined => {
  const extension = /\.(\w+)(?:[?#]|$)/u.exec(url)?.[1]?.toLowerCase();
  return extension ? AUDIO_MIME_TYPES[extension] : undefined;
};

/**
 * The speaker's name, read off the first derived pull quote that carries one.
 *
 * Indirect on purpose. The collection has no speaker field of its own, and adding one would mean a
 * postgres migration on a live sandbox branch days before the call. `speakerName` is set per quote
 * by the derive pipeline from the archive's own material, so it is a truthful source rather than a
 * literal - but it is NOT the shape to keep: the real build gives `Talk` a speaker relationship,
 * and this function goes away with it.
 *
 * Returns undefined rather than a name when nothing is set, so `author` is omitted entirely on the
 * items that have no derived layer instead of publishing an empty Person.
 */
const getSpeakerName = (pullQuotes: Talk["aiPullQuotes"]): string | undefined => {
  if (!Array.isArray(pullQuotes)) return undefined;

  for (const pullQuote of pullQuotes) {
    const name = pullQuote?.speakerName?.trim();
    if (name) return name;
  }

  return undefined;
};

/**
 * Seconds to an ISO-8601 duration, which is the only form schema.org accepts for `duration`.
 * Zero-valued components are dropped (579 -> PT9M39S) but a zero total still has to say PT0S,
 * because "PT" alone is not a duration.
 */
export const toIsoDuration = (totalSeconds: number): string => {
  const total = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const parts = [
    hours ? `${hours}H` : "",
    minutes ? `${minutes}M` : "",
    seconds || total === 0 ? `${seconds}S` : "",
  ].join("");

  return `PT${parts}`;
};

/**
 * Article markup for a talk page, including Google's paywalled-content pattern.
 *
 * Not createArticleSchema(): that one is typed to `Post`, resolves its URL through the blog base
 * path, and reads `post.authors`, none of which a Talk has. The paywall properties have no
 * equivalent there at all.
 *
 * `author` comes from getSpeakerName() and not from the site name, because the site is the
 * publisher, not the person who spoke. See that function for why the source is indirect.
 */
export function createTalkSchema({ talk, requiredTier, siteName, locale }: TalkSchemaParams) {
  const talkUrl = buildUrl({ collection: "talk", locale, slug: talk.slug });
  const baseUrl = getServerSideURL();

  const image = talk.meta?.image as Media | undefined;
  const imageUrl = image && typeof image === "object" ? `${baseUrl}${image.url}` : undefined;

  // The same chain the page's generateMetadata uses, so the description a crawler reads in the
  // head and the one it reads in the graph cannot disagree.
  const description = talk.meta?.description ?? talk.aiSummary ?? talk.teaser ?? undefined;

  const publisher = siteName
    ? {
        "@type": "Organization",
        name: siteName,
        url: buildUrl({ collection: "page", locale }),
      }
    : undefined;

  const speakerName = getSpeakerName(talk.aiPullQuotes);

  const topics = (Array.isArray(talk.topics) ? talk.topics : []).filter(
    (topic): topic is Topic => typeof topic === "object" && topic !== null
  );

  const mimeType = talk.audioUrl ? getAudioMimeType(talk.audioUrl) : undefined;

  // Emitted whenever there is audio to describe at all: a withheld stream still has a real,
  // measured length, and stating it is the point - their live site publishes the same placeholder
  // duration on every item.
  const audio =
    talk.audioUrl || talk.durationSeconds
      ? {
          "@type": "AudioObject",
          name: talk.title,
          ...(talk.audioUrl && { contentUrl: talk.audioUrl }),
          ...(mimeType && { encodingFormat: mimeType }),
          ...(talk.durationSeconds && {
            duration: toIsoDuration(talk.durationSeconds),
          }),
        }
      : undefined;

  const isFree = requiredTier === "visitor";

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: talk.title,
    inLanguage: locale,
    // Google reads isAccessibleForFree on the CreativeWork and the gated region it names in
    // hasPart. Both have to be present and both false for a metered item, or the truncated body
    // reads as cloaking rather than as a paywall.
    isAccessibleForFree: isFree,
    mainEntityOfPage: {
      "@id": talkUrl,
      "@type": "WebPage",
      inLanguage: locale,
    },
    url: talkUrl,
    ...(description && { description }),
    ...(imageUrl && { image: imageUrl }),
    ...(talk.publishedAt && {
      datePublished: new Date(talk.publishedAt).toISOString(),
    }),
    ...(talk.updatedAt && {
      dateModified: new Date(talk.updatedAt).toISOString(),
    }),
    ...(audio && { audio }),
    ...(topics.length > 0 && {
      about: topics.map((topic) => ({
        "@type": "Thing",
        name: topic.title,
        url: buildUrl({ collection: "topic", locale, slug: topic.slug }),
      })),
    }),
    ...(speakerName && {
      author: {
        "@type": "Person",
        name: speakerName,
      },
    }),
    ...(publisher && { publisher }),
    ...(!isFree && {
      hasPart: {
        "@type": "WebPageElement",
        cssSelector: `.${TALK_GATED_REGION_CLASS}`,
        isAccessibleForFree: false,
      },
    }),
  };
}
