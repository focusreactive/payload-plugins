import { heading, link, paragraph, richText } from "@focus-reactive/payload-plugin-seo/content";
import type { ContentExtractor, ContentNode } from "@focus-reactive/payload-plugin-seo/content";

type Section = Record<string, unknown> & { blockType?: string };

const asText = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asList = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null
      )
    : [];

function heroContent(section: Section): (ContentNode | null)[] {
  return [
    heading(1, asText(section.title)),
    paragraph(asText(section.description)),
    ...asList(section.cta).map((cta) => link(asText(cta.url), asText(cta.label))),
  ];
}

/** Reads the `sections` blocks of a dev-app page for the SEO analysis. */
const extractPageContent: ContentExtractor = (values, _ctx, { helpers }) =>
  helpers.compact(
    asList(values.sections).flatMap((section: Section) => {
      if (section.blockType === "hero") return heroContent(section);
      if (section.blockType === "content") return [richText(section.content)];
      return [];
    })
  );

export default extractPageContent;
