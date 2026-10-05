import type { CollectionConfig } from "payload";
import { slugField } from "payload";

import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { NEWS_CONFIG } from "@/lib/config/news";
import { denyPublishForAuthors } from "@/lib/hooks/denyPublishForAuthors";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { generateRichText } from "@/lib/utils/generateRichText";
import { generateSeoFields } from "@/lib/utils/seoFields";
import { slugify } from "@/lib/utils/slugify";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import { extractLexicalText } from "@/lib/utils/text";
import type { News as NewsDoc } from "@/payload-types";

import { revalidateNews, revalidateNewsDelete } from "./hooks/revalidateNews";

function previewPath(slug: string | null | undefined, locale: string) {
  return generatePreviewPath({
    collection: NEWS_CONFIG.collection,
    path: buildUrl({ absolute: false, collection: "news", locale, slug }),
    slug: slug ?? "",
  });
}

function hasText(value: unknown): boolean {
  return Boolean(value) && extractLexicalText(value as NewsDoc["content"]).trim().length > 0;
}

/** Press releases (old /news/<slug>.html): title, date, text. No engineer author, no tags. */
export const News: CollectionConfig<"news"> = {
  access: {
    create: or(superAdmin, user, author),
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
    defaultColumns: ["title", "slug", "publishedAt", "_status"],
    group: "Blog",
    livePreview: {
      url: ({ data, locale }) => previewPath(data?.slug, locale.code ?? locale.fallbackLocale),
    },
    preview: (data, { locale }) => previewPath(data?.slug as string, locale),
    useAsTitle: "title",
  },
  defaultPopulate: {
    excerpt: true,
    publishedAt: true,
    slug: true,
    title: true,
  },
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              label: "Title",
              localized: true,
              name: "title",
              required: true,
              type: "text",
            },
            {
              admin: { description: "One line for the news cards and feeds" },
              label: "Summary",
              localized: true,
              name: "excerpt",
              type: "textarea",
            },
            {
              editor: generateRichText("default"),
              label: "Text",
              localized: true,
              name: "content",
              validate: (value: unknown, { siblingData }: { siblingData: Partial<NewsDoc> }) =>
                hasText(value) || Boolean(siblingData?.markdown?.trim())
                  ? true
                  : "Add text, or migrated Markdown below",
              type: "richText",
            },
            {
              admin: {
                description:
                  "Body of a release migrated from the old site. Rendered after the text.",
                language: "markdown",
              },
              label: "Migrated text (Markdown)",
              localized: true,
              name: "markdown",
              type: "code",
            },
          ],
          label: "Content",
        },
        {
          fields: generateSeoFields(),
          label: "SEO",
          localized: true,
          name: "meta",
        },
      ],
      type: "tabs",
    },
    slugField({
      overrides: (field) => {
        const slugInput = field.fields?.[1] as { unique?: boolean } | undefined;
        if (slugInput) {
          slugInput.unique = true;
        }
        return field;
      },
      required: true,
      slugify,
      useAsSlug: "title",
    }),
    {
      admin: { date: { pickerAppearance: "dayOnly" }, position: "sidebar" },
      defaultValue: () => new Date().toISOString(),
      label: "Date",
      name: "publishedAt",
      required: true,
      type: "date",
    },
  ],
  hooks: {
    afterChange: [revalidateNews],
    afterDelete: [revalidateNewsDelete],
    beforeChange: [denyPublishForAuthors],
  },
  labels: {
    plural: "News",
    singular: "News item",
  },
  slug: NEWS_CONFIG.collection,
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
