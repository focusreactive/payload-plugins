import type { FeatureProviderServer } from "@payloadcms/richtext-lexical";
import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
  BoldFeature,
  ItalicFeature,
  UnderlineFeature,
  StrikethroughFeature,
  SubscriptFeature,
  SuperscriptFeature,
  InlineCodeFeature,
  ParagraphFeature,
  UnorderedListFeature,
  OrderedListFeature,
  IndentFeature,
  AlignFeature,
  LinkFeature,
  UploadFeature,
  BlocksFeature,
  BlockquoteFeature,
  EXPERIMENTAL_TableFeature,
} from "@payloadcms/richtext-lexical";
import type { Block, Field, RadioField } from "payload";

import { BLOG_CONFIG } from "@/lib/config/blog";

export type RichTextPreset = "default";

interface Options {
  blocks?: Block[];
}

const toolbarFeatures = [FixedToolbarFeature(), InlineToolbarFeature()];

const PAGE_OR_POST = { en: "Page or post", es: "Página o publicación" };
const WEB_ADDRESS = { en: "Web address (URL)", es: "Dirección web (URL)" };

const isInternalOption = (option: RadioField["options"][number]) =>
  typeof option === "object" && option.value === "internal";

/** "Link to": "Page or post" first (and preselected), like the standard link field. */
function relabelLinkType(field: RadioField): RadioField {
  const options = field.options.map((option) =>
    typeof option === "object"
      ? { ...option, label: isInternalOption(option) ? PAGE_OR_POST : WEB_ADDRESS }
      : option
  );
  const hasInternal = options.some(isInternalOption);
  return {
    ...field,
    admin: { ...field.admin, description: undefined, layout: "horizontal" },
    defaultValue: hasInternal ? "internal" : field.defaultValue,
    label: { en: "Link to", es: "Enlazar a" },
    options: [...options.filter(isInternalOption), ...options.filter((o) => !isInternalOption(o))],
  };
}

/**
 * Lexical's own link drawer keeps its stored shape (`linkType` internal/custom, `doc`, `url`,
 * `newTab`) but uses the words of the standard link field (`lib/fields/link.ts`).
 */
function relabelRichTextLinkField(field: Field): Field {
  if (!("name" in field)) return field;
  switch (field.name) {
    case "text":
      return { ...field, label: { en: "Link text", es: "Texto del enlace" } } as Field;
    case "linkType":
      return field.type === "radio" ? relabelLinkType(field) : field;
    case "url":
      return { ...field, label: WEB_ADDRESS } as Field;
    case "doc":
      return { ...field, label: PAGE_OR_POST } as Field;
    case "newTab":
      return {
        ...field,
        label: { en: "Open in new tab", es: "Abrir en una nueva pestaña" },
      } as Field;
    default:
      return field;
  }
}

export function generateRichText(preset: RichTextPreset = "default", options?: Options) {
  return lexicalEditor({
    features: ({ rootFeatures: _rootFeatures }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let defaultFeatures: FeatureProviderServer<any, any, any>[] = [];

      switch (preset) {
        case "default": {
          defaultFeatures = [
            ...toolbarFeatures,
            HeadingFeature(),
            ParagraphFeature(),
            BoldFeature(),
            ItalicFeature(),
            UnderlineFeature(),
            StrikethroughFeature(),
            SubscriptFeature(),
            SuperscriptFeature(),
            InlineCodeFeature(),
            UnorderedListFeature(),
            OrderedListFeature(),
            IndentFeature(),
            AlignFeature(),
            LinkFeature({
              enabledCollections: ["page", BLOG_CONFIG.collection],
              fields: ({ defaultFields }) => [
                ...defaultFields.map((field) => relabelRichTextLinkField(field as Field)),
                {
                  label: {
                    en: "Link attributes for search engines (advanced)",
                    es: "Atributos del enlace para buscadores (avanzado)",
                  },
                  name: "rel",
                  options: ["noopener", "noreferrer", "nofollow"],
                  type: "select",
                },
              ],
              maxDepth: 2,
            }),
            UploadFeature({
              collections: {
                media: {
                  fields: [
                    {
                      defaultValue: "1/1",
                      label: { en: "Image shape", es: "Forma de la imagen" },
                      name: "aspectRatio",
                      options: [
                        { label: { en: "Wide (16:9)", es: "Panorámica (16:9)" }, value: "16/9" },
                        { label: { en: "Landscape (3:2)", es: "Horizontal (3:2)" }, value: "3/2" },
                        { label: { en: "Classic (4:3)", es: "Clásica (4:3)" }, value: "4/3" },
                        { label: { en: "Square (1:1)", es: "Cuadrada (1:1)" }, value: "1/1" },
                        { label: { en: "Tall (9:16)", es: "Vertical (9:16)" }, value: "9/16" },
                        { label: { en: "Portrait (1:2)", es: "Retrato (1:2)" }, value: "1/2" },
                        { label: { en: "Banner (4:1)", es: "Banner (4:1)" }, value: "4/1" },
                        { label: { en: "Strip (3:1)", es: "Franja (3:1)" }, value: "3/1" },
                        { label: { en: "Original shape", es: "Forma original" }, value: "auto" },
                      ],
                      type: "select",
                    },
                  ],
                },
              },
            }),
            BlockquoteFeature(),
            EXPERIMENTAL_TableFeature(),
          ];
          break;
        }
        default: {
          const _: never = preset;
          throw new Error("Invalid preset");
        }
      }

      const blockFeatures = options?.blocks?.length
        ? [BlocksFeature({ blocks: options.blocks })]
        : [];

      return [...defaultFeatures, ...blockFeatures];
    },
  });
}
