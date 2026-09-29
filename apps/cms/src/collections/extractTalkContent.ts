/**
 * Content extractor for the SEO plugin, on the shape of a single archive item: a title, a
 * rich-text body and the derived summary/takeaways/questions layer above it.
 *
 * The plugin resolves an extractor by the path string configured as `extractContentPath`, which
 * an admin-mounted client module maps back to this function. Both halves are required - a
 * collection registered in the plugin config but missing from the registrar (or the reverse) is
 * what makes a Generate button click with no request and no error.
 */

import { heading, paragraph } from "@focus-reactive/payload-plugin-seo/content";
import type { ContentExtractor, DocStore } from "@focus-reactive/payload-plugin-seo/content";

import { I18N_CONFIG } from "@/lib/config/i18n";
import { asArray, buildRefQueries, richTextToContent } from "@/lib/contentExtraction";
import type { LinkResolveCtx } from "@/lib/contentExtraction";
import type { Talk } from "@/payload-types";

const extractTalkContent: ContentExtractor = async (values, ctx, { resolveDocs, helpers }) => {
  const talk = values as Partial<Talk>;
  const locale = ctx.locale ?? I18N_CONFIG.defaultLocale;
  const docs: DocStore = await resolveDocs(buildRefQueries(values));
  const linkCtx: LinkResolveCtx = { docs, locale };

  const takeaways = asArray<{ takeaway?: string | null }>(talk.aiTakeaways);
  const questions = asArray<{ question?: string | null }>(talk.aiQuestions);

  // The transcript is left out on purpose. It is the longest field on the document by an order of
  // magnitude and generation truncates the serialized content at 6,000 characters, so including it
  // would push the body, the summary and the takeaways out of the prompt entirely.
  //
  // Takeaways and questions carry no heading of their own either: the labels above them are
  // rendered and localized by the frontend, and inventing an English one here would put
  // untranslated text into the analysis of a non-English document.
  return helpers.compact([
    heading(1, talk.title),
    paragraph(talk.aiSummary),
    paragraph(talk.teaser),
    ...richTextToContent(talk.body, linkCtx),
    ...takeaways.map((item) => paragraph(item.takeaway)),
    ...questions.map((item) => paragraph(item.question)),
  ]);
};

export default extractTalkContent;
