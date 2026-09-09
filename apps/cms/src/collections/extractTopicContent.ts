/**
 * Content extractor for the SEO plugin, on the shape of a vocabulary term: a title and a short
 * description. See extractTalkContent.ts for why an extractor must be registered in two places.
 */

import { heading, paragraph } from "@focus-reactive/payload-plugin-seo/content";
import type { ContentExtractor } from "@focus-reactive/payload-plugin-seo/content";

import type { Topic } from "@/payload-types";

// No rich text, no media and no relationships on the document, so no resolveDocs pass is needed -
// the extractor is synchronous, which the ContentExtractor contract allows.
const extractTopicContent: ContentExtractor = (values, _ctx, { helpers }) => {
  const topic = values as Partial<Topic>;

  return helpers.compact([heading(1, topic.title), paragraph(topic.description)]);
};

export default extractTopicContent;
