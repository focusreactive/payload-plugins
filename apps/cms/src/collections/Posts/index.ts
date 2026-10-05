import type { CollectionConfig, GroupField } from "payload";

import { CardsGridInlineBlock } from "@/blocks/CardsGrid/inlineConfig";
import { CodeInlineBlock } from "@/blocks/Code/inlineConfig";
import { CtaBannerInlineBlock } from "@/blocks/CtaBanner/inlineConfig";
import { LogosInlineBlock } from "@/blocks/Logos/inlineConfig";
import { VideoEmbedInlineBlock } from "@/blocks/VideoEmbed/inlineConfig";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { anyone, author, or, user, superAdmin } from "@/lib/access";
import {
  createLocalizedDefault,
  createLocalizedRichText,
} from "@/lib/utils/createLocalizedDefault";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { generateRichText } from "@/lib/utils/generateRichText";
import { generateSeoFields } from "@/lib/utils/seoFields";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/lib/fields/link";
import { createSharedSlugField } from "@/lib/fields/slugField";
import { extractLexicalText } from "@/lib/utils/text";
import type { Post } from "@/payload-types";

import { computeReadingTime } from "./hooks/computeReadingTime";
import { revalidateDelete, revalidatePost } from "./hooks/revalidatePost";
import { denyPublishForAuthors } from "@/lib/hooks/denyPublishForAuthors";

function hasLexicalText(value: unknown): boolean {
  return Boolean(value) && extractLexicalText(value as Post["content"]).trim().length > 0;
}

function hasMarkdown(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export const Posts: CollectionConfig<"posts"> = {
  access: {
    create: or(superAdmin, user, author),
    // Only administrators delete content (§5.7).
    delete: superAdmin,
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    components: {
      edit: {
        PreviewButton: "/components/admin/VisualPreviewButton#VisualPreviewButton",
      },
    },
    defaultColumns: ["title", "slug", "heroImage", "updatedAt"],
    group: "Blog",
    livePreview: {
      url: ({ data, locale: localeProp }) => {
        const locale = localeProp.code ?? localeProp.fallbackLocale;

        return generatePreviewPath({
          collection: BLOG_CONFIG.collection,
          path: buildUrl({
            absolute: false,
            collection: "posts",
            locale,
            slug: data?.slug,
          }),
          slug: data?.slug,
        });
      },
    },
    pagination: {
      limits: [20, 50, 100],
    },
    preview: (data, { locale }) =>
      generatePreviewPath({
        collection: BLOG_CONFIG.collection,
        path: buildUrl({
          collection: "posts",
          slug: data?.slug as string,
          absolute: false,
          locale,
        }),
        slug: data?.slug as string,
      }),
    useAsTitle: "title",
  },
  defaultPopulate: {
    authors: true,
    tags: true,
    excerpt: true,
    heroImage: true,
    publishedAt: true,
    readingTime: true,
    slug: true,
    title: true,
  },
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              defaultValue: createLocalizedDefault(DEFAULT_VALUES.collections.posts.title),
              label: "Title",
              localized: true,
              name: "title",
              required: true,
              type: "text",
            },
            {
              defaultValue: createLocalizedDefault(DEFAULT_VALUES.collections.posts.excerpt),
              label: "Excerpt",
              localized: true,
              name: "excerpt",
              required: true,
              type: "textarea",
            },
            {
              defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
              label: "Hero Image",
              name: "heroImage",
              relationTo: "media",
              required: true,
              type: "upload",
            },
            {
              defaultValue: createLocalizedRichText(DEFAULT_VALUES.richText.content),
              editor: generateRichText("default", {
                blocks: [
                  CardsGridInlineBlock,
                  LogosInlineBlock,
                  CodeInlineBlock,
                  CtaBannerInlineBlock,
                  VideoEmbedInlineBlock,
                ],
              }),
              label: "Content",
              localized: true,
              name: "content",
              // A migrated post may carry its whole body in `markdown` until an editor reworks it.
              validate: (value: unknown, { siblingData }: { siblingData: Partial<Post> }) =>
                hasLexicalText(value) || hasMarkdown(siblingData?.markdown)
                  ? true
                  : "Add content, or migrated Markdown below",
              type: "richText",
            },
            {
              admin: {
                description:
                  "Body of a post migrated from the old site. Rendered after the rich text. Move it into Content when you rework the post.",
                language: "markdown",
              },
              label: "Migrated content (Markdown)",
              localized: true,
              name: "markdown",
              type: "code",
            },
            {
              admin: {
                description: "Optional FAQ shown after the article body.",
              },
              fields: [
                {
                  label: "Heading",
                  localized: true,
                  name: "heading",
                  type: "text",
                },
                {
                  admin: { initCollapsed: true },
                  fields: [
                    {
                      label: "Question",
                      localized: true,
                      name: "question",
                      required: true,
                      type: "text",
                    },
                    {
                      editor: generateRichText(),
                      label: "Answer",
                      localized: true,
                      name: "answer",
                      required: true,
                      type: "richText",
                    },
                  ],
                  localized: true,
                  name: "items",
                  type: "array",
                },
              ],
              label: "FAQ",
              name: "faq",
              type: "group",
            },
            {
              admin: {
                description:
                  "Optional CTA band shown at the end of the post. Hidden when the heading is empty.",
              },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      admin: { width: "40%" },
                      label: "Eyebrow",
                      localized: true,
                      name: "eyebrow",
                      type: "text",
                    },
                    {
                      admin: { width: "60%" },
                      label: "Heading",
                      localized: true,
                      name: "heading",
                      type: "text",
                    },
                  ],
                },
                {
                  label: "Description",
                  localized: true,
                  name: "description",
                  type: "textarea",
                },
                {
                  admin: { initCollapsed: true },
                  fields: (link() as GroupField).fields,
                  label: "Actions",
                  localized: true,
                  maxRows: 2,
                  name: "actions",
                  type: "array",
                },
              ],
              label: "CTA",
              name: "cta",
              type: "group",
            },
          ],
          label: "Content",
        },
        {
          fields: generateSeoFields({
            generation: true,
            robotsDefault: "noindex",
          }),
          label: "SEO",
          localized: true,
          name: "meta",
        },
      ],
      type: "tabs",
    },
    createSharedSlugField("posts"),
    {
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Where this article lived on the old site",
      },
      label: "Source URL",
      name: "sourceUrl",
      type: "text",
    },
    {
      admin: { hidden: true },
      name: "legacyPath",
      type: "text",
    },
    {
      admin: {
        date: {
          pickerAppearance: "dayAndTime",
        },
        position: "sidebar",
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === "published" && !value) {
              return new Date();
            }
            return value;
          },
        ],
      },
      index: true,
      label: "Published At",
      name: "publishedAt",
      type: "date",
    },
    {
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Estimated reading time in minutes. Auto-calculated from the content on save.",
      },
      label: "Reading Time (min)",
      localized: true,
      name: "readingTime",
      type: "number",
    },
    {
      admin: {
        position: "sidebar",
      },
      hasMany: true,
      label: "Tags",
      name: "tags",
      relationTo: "tags",
      required: true,
      type: "relationship",
    },
    {
      admin: {
        position: "sidebar",
      },
      hasMany: true,
      label: "Authors",
      name: "authors",
      relationTo: "authors",
      required: true,
      type: "relationship",
    },
    {
      admin: {
        description:
          "Select up to 3 related posts. If fewer than 3 are selected, additional posts from the same tags will be shown automatically based on publish date.",
        position: "sidebar",
      },
      filterOptions: ({ id }) => ({
        id: {
          not_in: [id],
        },
      }),
      hasMany: true,
      label: "Related Posts",
      name: "relatedPosts",
      relationTo: BLOG_CONFIG.collection,
      type: "relationship",
    },
  ],
  hooks: {
    beforeChange: [denyPublishForAuthors, computeReadingTime],
    afterChange: [revalidatePost],
    afterDelete: [revalidateDelete],
  },
  labels: {
    plural: "Posts",
    singular: "Post",
  },
  slug: BLOG_CONFIG.collection,
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
