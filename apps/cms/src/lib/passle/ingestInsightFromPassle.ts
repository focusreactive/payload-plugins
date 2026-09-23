import { JSDOM } from "jsdom";
import { convertHTMLToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import type { Payload, TypedLocale } from "payload";

import type { Person } from "@/payload-types";

import { fetchPasslePost } from "./fetchPasslePost";

export interface IngestInsightResult {
  authorMatched: boolean;
  created: boolean;
  insightId: number;
  unmatchedAuthorEmail: string | null;
}

/**
 * The one place that turns a Passle post shortcode into an Insight. Used by
 * both the live ingest route and the seed script, so a rehearsal reset goes
 * through the exact same path a real webhook would.
 *
 * Re-running the same shortcode only ever touches the fields Passle itself
 * supplies (title, standfirst, article body, published date, author match).
 * It never sets `slug` or `markets`, because those are the two fields an
 * editor owns once the insight exists, and a re-sync must not clobber them.
 */
export async function ingestInsightFromPassle({
  context,
  locale = "en",
  payload,
  postShortcode,
}: {
  context?: Record<string, unknown>;
  locale?: TypedLocale;
  payload: Payload;
  postShortcode: string;
}): Promise<IngestInsightResult> {
  const passlePost = await fetchPasslePost(postShortcode);

  if (!passlePost) {
    throw new Error(`Passle has no post with shortcode "${postShortcode}".`);
  }

  const primaryAuthor = passlePost.Authors[0];
  const authorEmail = primaryAuthor?.EmailAddress?.trim().toLowerCase();

  let matchedPersonId: number | null = null;
  // An article inherits the markets of the person who wrote it. Without this every insight lands
  // with an empty market set, which the author-market rule treats as "not decided yet" and passes,
  // so the rule could never fire on seeded content.
  let matchedPersonMarkets: Person["markets"] | null = null;
  if (authorEmail) {
    const personMatch = await payload.find({
      collection: "person",
      context,
      limit: 1,
      overrideAccess: true,
      where: {
        email: { equals: authorEmail },
      },
    });
    matchedPersonId = personMatch.docs[0]?.id ?? null;
    matchedPersonMarkets = personMatch.docs[0]?.markets ?? null;
  }

  const editorConfig = await editorConfigFactory.default({ config: payload.config });

  // Passle wraps every post in a featured-media div and sprinkles embeds through the body. The
  // HTML converter turns those into nodes the Insight editor does not enable, and Payload then
  // rejects the whole field as invalid without naming the node - so the media goes first and the
  // prose is what gets stored.
  const prose = passlePost.PostContentHtml.replaceAll(
    /<(img|picture|iframe|video|source|script|style)\b[^>]*>[\s\S]*?<\/\1>|<(img|source)\b[^>]*\/?>/gi,
    ""
  );

  const convertedBody = convertHTMLToLexical({
    editorConfig,
    html: prose,
    JSDOM,
  });

  // Some Passle posts are a video embed or a single image with no prose, and the HTML converter
  // returns a root with no children for those. The body field is required, so an empty root fails
  // validation and takes the whole ingest with it - fall back to the snippet Passle always sends.
  const hasBodyContent = (convertedBody?.root?.children?.length ?? 0) > 0;
  const bodyRichText = hasBodyContent
    ? convertedBody
    : convertHTMLToLexical({
        editorConfig,
        html: `<p>${passlePost.ContentTextSnippet ?? passlePost.PostTitle}</p>`,
        JSDOM,
      });

  // The slug field generates from the title on save, but Payload's typed create still wants the
  // property present, so the ingest supplies the same slugified title rather than an empty string.
  const slugFromTitle = passlePost.PostTitle.toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80);

  const passleSourcedData = {
    author: matchedPersonId,
    markets: matchedPersonMarkets ?? undefined,
    slug: slugFromTitle,
    body: bodyRichText,
    publishedDate: passlePost.PublishedDate,
    standfirst: passlePost.ContentTextSnippet,
    title: passlePost.PostTitle,
    unmatchedAuthorEmail: matchedPersonId ? null : (primaryAuthor?.EmailAddress ?? null),
  };

  const existingInsight = await payload.find({
    collection: "insight",
    context,
    limit: 1,
    overrideAccess: true,
    where: {
      passleShortcode: { equals: passlePost.PostShortcode },
    },
  });

  const existingId = existingInsight.docs[0]?.id;

  if (existingId) {
    await payload.update({
      id: existingId,
      collection: "insight",
      context,
      data: passleSourcedData,
      draft: false,
      locale,
      overrideAccess: true,
    });

    return {
      authorMatched: Boolean(matchedPersonId),
      created: false,
      insightId: existingId,
      unmatchedAuthorEmail: passleSourcedData.unmatchedAuthorEmail,
    };
  }

  const created = await payload.create({
    collection: "insight",
    context,
    data: {
      ...passleSourcedData,
      passleShortcode: passlePost.PostShortcode,
    },
    draft: false,
    locale,
    overrideAccess: true,
  });

  return {
    authorMatched: Boolean(matchedPersonId),
    created: true,
    insightId: created.id,
    unmatchedAuthorEmail: passleSourcedData.unmatchedAuthorEmail,
  };
}
