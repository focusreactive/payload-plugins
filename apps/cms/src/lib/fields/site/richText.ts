import {
  BoldFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnderlineFeature,
  UnorderedListFeature,
  lexicalEditor,
} from "@payloadcms/richtext-lexical";
import type { RichTextField } from "payload";

import { ROUTED_COLLECTIONS } from "./siteLink";

interface RichTextOptions {
  name: string;
  label: string;
  description: string;
  localized?: boolean;
  required?: boolean;
}

/** One line of heading text where single words can be set in italics, bold or underlined. */
export function headingRichText({
  name,
  label,
  description,
  localized,
  required,
}: RichTextOptions): RichTextField {
  return {
    admin: { description },
    editor: lexicalEditor({
      features: () => [
        ParagraphFeature(),
        BoldFeature(),
        ItalicFeature(),
        UnderlineFeature(),
        InlineToolbarFeature(),
      ],
    }),
    label,
    localized,
    name,
    required,
    type: "richText",
  };
}

/** Running text: paragraphs, lists, small headings and links. Only what the site renders. */
export function bodyRichText({
  name,
  label,
  description,
  localized,
  required,
}: RichTextOptions): RichTextField {
  return {
    admin: { description },
    editor: lexicalEditor({
      features: () => [
        ParagraphFeature(),
        BoldFeature(),
        ItalicFeature(),
        UnderlineFeature(),
        HeadingFeature({ enabledHeadingSizes: ["h2", "h3", "h4", "h5"] }),
        UnorderedListFeature(),
        OrderedListFeature(),
        LinkFeature({ enabledCollections: [...ROUTED_COLLECTIONS] }),
        InlineToolbarFeature(),
      ],
    }),
    label,
    localized,
    name,
    required,
    type: "richText",
  };
}
