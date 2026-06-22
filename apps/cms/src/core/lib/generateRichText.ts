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
import type { Block } from "payload";

import { BLOG_CONFIG } from "@/core/config/blog";

export type RichTextPreset = "default" | "hero";

interface Options {
  blocks?: Block[];
}

const toolbarFeatures = [FixedToolbarFeature(), InlineToolbarFeature()];

export function generateRichText(preset: RichTextPreset = "default", options?: Options) {
  return lexicalEditor({
    features: ({ rootFeatures: _rootFeatures }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let defaultFeatures: FeatureProviderServer<any, any, any>[] = [];

      switch (preset) {
        case "hero": {
          defaultFeatures = [
            ...toolbarFeatures,
            HeadingFeature(),
            ParagraphFeature(),
            BoldFeature(),
            UnderlineFeature(),
            StrikethroughFeature(),
            ItalicFeature(),
            ParagraphFeature(),
            SubscriptFeature(),
            SuperscriptFeature(),
            InlineCodeFeature(),
            UnorderedListFeature(),
            OrderedListFeature(),
            IndentFeature(),
            AlignFeature(),
          ];
          break;
        }
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
                ...defaultFields,
                {
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
                      label: { en: "Aspect Ratio", es: "Relación de aspecto" },
                      name: "aspectRatio",
                      options: [
                        { label: { en: "16/9", es: "16/9" }, value: "16/9" },
                        { label: { en: "3/2", es: "3/2" }, value: "3/2" },
                        { label: { en: "4/3", es: "4/3" }, value: "4/3" },
                        { label: { en: "1/1", es: "1/1" }, value: "1/1" },
                        { label: { en: "9/16", es: "9/16" }, value: "9/16" },
                        { label: { en: "1/2", es: "1/2" }, value: "1/2" },
                        { label: { en: "4/1", es: "4/1" }, value: "4/1" },
                        { label: { en: "3/1", es: "3/1" }, value: "3/1" },
                        { label: { en: "Auto", es: "Auto" }, value: "auto" },
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
