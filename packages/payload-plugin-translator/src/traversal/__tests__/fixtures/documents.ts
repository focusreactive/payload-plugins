import type { FieldLike } from "./payloadFields.js";
import { PROSEMIRROR_ID } from "./prosemirror.js";

export const articleSchema: FieldLike[] = [
  { type: "text", name: "title", localized: true },
  { type: "text", name: "slug" },
  { type: "text", name: "secret", localized: true, excluded: true },
  { type: "ui", name: "preview" },
  {
    type: "row",
    fields: [{ type: "text", name: "kicker", localized: true }],
  },
  { type: "group", name: "meta", fields: [{ type: "text", name: "caption", localized: true }] },
  {
    type: "blocks",
    name: "sections",
    blocks: [
      { slug: "hero", fields: [{ type: "text", name: "heading", localized: true }] },
      {
        slug: "quote",
        fields: [
          { type: "text", name: "quote", localized: true },
          { type: "text", name: "author", localized: true },
        ],
      },
    ],
  },
];

export const article = () => ({
  title: "Hello",
  slug: "hello",
  secret: "do not send",
  kicker: "Kicker",
  meta: { caption: "Caption" },
  sections: [
    { id: "a", blockType: "hero", heading: "Hi" },
    { id: "b", blockType: "quote", quote: "Quote", author: "Author" },
  ],
});

export const bodySchema = (richTextLanguage: string = PROSEMIRROR_ID): FieldLike[] => [
  {
    type: "richText",
    name: "body",
    localized: true,
    richTextLanguage,
    embeds: [
      {
        slug: "cta",
        fields: [
          { type: "text", name: "heading", localized: true },
          { type: "text", name: "description", localized: true },
        ],
      },
    ],
  },
];

export const bodyDocument = () => ({
  body: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Lead in" }] },
      {
        type: "blok",
        attrs: {
          id: "cta-1",
          body: [{ component: "cta", heading: "Click me", description: "Please" }],
        },
      },
    ],
  },
});
