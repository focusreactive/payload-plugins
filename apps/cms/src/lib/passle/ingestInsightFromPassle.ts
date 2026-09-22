import { JSDOM } from "jsdom";
import { convertHTMLToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import type { Payload, TypedLocale } from "payload";

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
  }

  const editorConfig = await editorConfigFactory.default({ config: payload.config });
  const convertedBody = convertHTMLToLexical({
    editorConfig,
    html: passlePost.PostContentHtml,
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
