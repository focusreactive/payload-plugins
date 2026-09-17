/**
 * What a Talk and a Topic look like to the embedding model.
 *
 * These sit here rather than beside their collection, the way Page's and Post's do, because
 * `Talk.ts` and `Topic.ts` are single files rather than folders - there is no collection directory
 * to put them in without moving the collection itself.
 *
 * They are NOT the SEO plugin's `extractTalkContent` / `extractTopicContent`. Those return the
 * plugin's own content nodes for an LLM prompt and truncate at 6,000 characters; this returns one
 * plain string for `text-embedding-3-small`, which is a different budget and a different shape.
 */

import { extractLexicalText, joinText } from "@/lib/utils/text";
import type { Talk, Topic } from "@/payload-types";

export function extractTalkText(talk: Talk): string {
  const takeaways = (talk.aiTakeaways ?? []).map((item) => item.takeaway);
  const questions = (talk.aiQuestions ?? []).map((item) => item.question);
  const pullQuotes = (talk.aiPullQuotes ?? []).map((item) => item.quote);

  /*
   * The transcript is deliberately absent, for a different reason than it is absent from the SEO
   * extractor. An embedding is one vector for the whole string, so a 60,000-character transcript
   * would average the talk's actual subject away into whatever the speaker happened to say most -
   * a search for "anger" would match a talk that says "you know" four hundred times just as well.
   * The derived layer above it (summary, questions, takeaways) is what states the subject, and it
   * is what this embeds.
   *
   * The 13 talks with no AI layer still index on title, teaser and body, which is what the
   * `joinText` filter is doing: an absent field contributes nothing rather than an empty gap.
   */
  return joinText([
    talk.title,
    talk.teaser,
    talk.aiSummary,
    ...takeaways,
    ...questions,
    ...pullQuotes,
    extractLexicalText(talk.body),
  ]);
}

export function extractTopicText(topic: Topic): string {
  return joinText([topic.title, topic.description]);
}
