import type { CollectionConfig } from "payload";

import { CardsGridInlineBlock } from "@/blocks/CardsGrid/inlineConfig";
import { CodeInlineBlock } from "@/blocks/Code/inlineConfig";
import { contentBlocks } from "@/blocks/contentBlocks";
import { CtaBannerInlineBlock } from "@/blocks/CtaBanner/inlineConfig";
import { LogosInlineBlock } from "@/blocks/Logos/inlineConfig";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import {
  createLivePreviewEditComponents,
  createLivePreviewVersions,
} from "@/lib/config/livePreview";
import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { anyone, author, editor, or, user, superAdmin } from "@/lib/access";
import {
  createLocalizedDefault,
  createLocalizedRichText,
} from "@/lib/utils/createLocalizedDefault";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { generateRichText } from "@/lib/utils/generateRichText";
import { generateSeoFields } from "@/lib/utils/seoFields";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { PUBLIC_URL_FIELD_NAME, publicUrlField } from "@/lib/fields/publicUrlField";
import { createSharedSlugField } from "@/lib/fields/slugField";

import { computeReadingTime } from "./hooks/computeReadingTime";
import { indexPostEmbedding, deletePostEmbedding } from "./hooks/indexEmbedding";
import { revalidateDelete, revalidatePost } from "./hooks/revalidatePost";

export const Posts: CollectionConfig<"posts"> = {
  access: {
    create: or(superAdmin, user, author, editor),
    delete: or(superAdmin, user, author, editor),
    read: anyone,
    update: or(superAdmin, user, author, editor),
  },
  admin: {
    components: {
      edit: createLivePreviewEditComponents(),
    },
    defaultColumns: ["title", PUBLIC_URL_FIELD_NAME, "heroImage", "updatedAt"],
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
    categories: true,
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
              label: {
                en: "Title",
                es: "Título",
              },
              localized: true,
              name: "title",
              required: true,
              type: "text",
            },
            {
              defaultValue: createLocalizedDefault(DEFAULT_VALUES.collections.posts.excerpt),
              label: {
                en: "Excerpt",
                es: "Extracto",
              },
              localized: true,
              name: "excerpt",
              required: true,
              type: "textarea",
            },
            {
              defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
              label: {
                en: "Cover image",
                es: "Imagen de portada",
              },
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
                ],
              }),
              label: {
                en: "Content",
                es: "Contenido",
              },
              localized: true,
              name: "content",
              required: true,
              type: "richText",
            },
            {
              admin: { initCollapsed: true },
              // Same section library as pages, minus GlobalSectionSlot: global sections are managed
              // outside the Blog (editors cannot read them) and their usage tracking/revalidation
              // only covers pages.
              blocks: contentBlocks,
              label: { en: "Sections", es: "Secciones" },
              localized: true,
              name: "blocks",
              type: "blocks",
            },
          ],
          label: {
            en: "Content",
            es: "Contenido",
          },
        },
        {
          fields: generateSeoFields({
            generation: true,
            robotsDefault: "noindex",
          }),
          label: {
            en: "SEO",
            es: "SEO",
          },
          localized: true,
          name: "meta",
        },
      ],
      type: "tabs",
    },
    createSharedSlugField("posts"),
    publicUrlField(),
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
      label: {
        en: "Publish date",
        es: "Fecha de publicación",
      },
      name: "publishedAt",
      type: "date",
    },
    {
      admin: {
        // Computed on save (computeReadingTime) and stored for post cards; not an editor concern.
        hidden: true,
        position: "sidebar",
        readOnly: true,
      },
      label: {
        en: "Reading Time (min)",
        es: "Tiempo de lectura (min)",
      },
      localized: true,
      name: "readingTime",
      type: "number",
    },
    {
      admin: {
        position: "sidebar",
      },
      hasMany: true,
      label: {
        en: "Categories",
        es: "Categorías",
      },
      name: "categories",
      relationTo: "categories",
      required: true,
      type: "relationship",
    },
    {
      admin: {
        position: "sidebar",
      },
      hasMany: true,
      label: {
        en: "Authors",
        es: "Autores",
      },
      name: "authors",
      relationTo: "authors",
      required: true,
      type: "relationship",
    },
    {
      admin: {
        position: "sidebar",
      },
      filterOptions: ({ id }) => ({
        id: {
          not_in: [id],
        },
      }),
      hasMany: true,
      label: {
        en: "Related posts",
        es: "Publicaciones relacionadas",
      },
      maxRows: 3,
      name: "relatedPosts",
      relationTo: BLOG_CONFIG.collection,
      type: "relationship",
    },
  ],
  hooks: {
    beforeChange: [computeReadingTime],
    afterChange: [revalidatePost, indexPostEmbedding],
    afterDelete: [revalidateDelete, deletePostEmbedding],
  },
  labels: {
    plural: {
      en: "Posts",
      es: "Publicaciones",
    },
    singular: {
      en: "Post",
      es: "Publicación",
    },
  },
  slug: BLOG_CONFIG.collection,
  versions: createLivePreviewVersions(),
};
