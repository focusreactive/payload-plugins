/** The walks the suite drives, so each test file shows its own case and nothing else. */

import type { RegisteredLanguage } from "../../contract.js";
import { collectTranslationTargets } from "../../collect.js";
import type { Doc, FieldLike } from "./payloadFields.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "./payloadFields.js";
import { PROSEMIRROR_ID, prosemirrorLanguage } from "./prosemirror.js";
import type { Blok, ComponentRegistry } from "./storyblok.js";
import { STORYBLOK_ID, storyblokLanguage } from "./storyblok.js";

export const LEVELS = 5;
/** Into the rich text, and back out into the embed. */
export const CROSSINGS_PER_LEVEL = 2;

export function richTextNestedThroughEmbeds(levels: number): {
  fields: FieldLike[];
  document: Doc;
} {
  const richText = (level: number): FieldLike => ({
    type: "richText",
    name: "body",
    localized: true,
    richTextLanguage: PROSEMIRROR_ID,
    embeds: [
      {
        slug: "cta",
        fields:
          level >= levels
            ? [{ type: "text", name: "heading", localized: true }]
            : [{ type: "text", name: "heading", localized: true }, richText(level + 1)],
      },
    ],
  });

  const value = (level: number): Doc => ({
    body: {
      type: "doc",
      content: [
        {
          type: "blok",
          attrs: {
            id: `b${level}`,
            body: [
              level >= levels
                ? { component: "cta", heading: `level ${level}` }
                : { component: "cta", heading: `level ${level}`, ...value(level + 1) },
            ],
          },
        },
      ],
    },
  });

  return { fields: [richText(1)], document: value(1) };
}

export const paragraph = () => ({
  body: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "I bought a " },
          { type: "text", text: "red", marks: [{ type: "bold" }] },
          { type: "text", text: " car" },
        ],
      },
    ],
  },
});

export const collect = (args: {
  fields: FieldLike[];
  source: Doc;
  target: Doc;
  maxCrossings?: number;
  onSelectedWithoutText?: (idPath: readonly (string | number)[], value: unknown) => void;
  cut?: "per-text-node" | "whole-container";
}) =>
  collectTranslationTargets({
    languages: [payloadFieldsLanguage(), prosemirrorLanguage({ cut: args.cut ?? "per-text-node" })],
    entry: {
      languageId: PAYLOAD_FIELDS_ID,
      context: { fields: args.fields, source: args.source, target: args.target },
    },
    onSelectedWithoutText: args.onSelectedWithoutText,
    maxCrossings: args.maxCrossings,
  });

export const postsSchema = (richTextLanguage: string): FieldLike[] => [
  {
    type: "richText",
    name: "content",
    localized: true,
    richTextLanguage,
    embeds: [
      {
        slug: "ctaBanner",
        fields: [
          { type: "text", name: "heading", localized: true },
          { type: "text", name: "description", localized: true },
          { type: "text", name: "href" },
          // A container *inside* the embed: the address has to keep accumulating after the
          // crossing, which one level of nesting never shows.
          {
            type: "array",
            name: "actions",
            fields: [{ type: "text", name: "label", localized: true }],
          },
        ],
      },
    ],
  },
];

export const lexicalPost = () => ({
  content: {
    root: {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", text: "Intro" }] },
        {
          type: "inlineBlock",
          fields: {
            blockType: "ctaBanner",
            heading: "Click me",
            description: "Please",
            href: "/buy",
            actions: [
              { id: "a1", label: "Get started" },
              { id: "a2", label: "Read the docs" },
            ],
          },
        },
      ],
    },
  },
});

export const embedOf = (document: ReturnType<typeof lexicalPost>) =>
  document.content.root.children[1]?.fields;

export const fromPayload = (
  fields: FieldLike[],
  document: Record<string, unknown>,
  rich: RegisteredLanguage
) =>
  collectTranslationTargets({
    languages: [payloadFieldsLanguage(), rich],
    entry: {
      languageId: PAYLOAD_FIELDS_ID,
      context: { fields, source: document, target: document },
    },
  });

export const storyRegistry = (richTextLanguage: string): ComponentRegistry => ({
  page: {
    title: { type: "text", translatable: true },
    body: { type: "richtext", translatable: true, richTextLanguage, allowedEmbeds: ["cta"] },
  },
  cta: {
    headline: { type: "text", translatable: true },
    link: { type: "text" },
  },
});

export const fromStoryblok = (registry: ComponentRegistry, story: Blok, rich: RegisteredLanguage) =>
  collectTranslationTargets({
    languages: [storyblokLanguage(), rich],
    entry: {
      languageId: STORYBLOK_ID,
      context: { registry, source: story, target: story },
    },
  });
