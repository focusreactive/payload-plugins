import type { CollectionConfig, GroupField } from "payload";

import { CardsGridInlineBlock } from "@/blocks/CardsGrid/inlineConfig";
import { CodeInlineBlock } from "@/blocks/Code/inlineConfig";
import { LogosInlineBlock } from "@/blocks/Logos/inlineConfig";
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

import { indexPostEmbedding, deletePostEmbedding } from "./hooks/indexEmbedding";
import { revalidateDelete, revalidatePost } from "./hooks/revalidatePost";

export const Posts: CollectionConfig<"posts"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: or(superAdmin, user, author),
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["title", "slug", "updatedAt"],
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
                en: "Hero Image",
                es: "Imagen de la cabecera",
              },
              name: "heroImage",
              relationTo: "media",
              required: true,
              type: "upload",
            },
            {
              defaultValue: createLocalizedRichText(DEFAULT_VALUES.richText.content),
              editor: generateRichText("default", {
                blocks: [CardsGridInlineBlock, LogosInlineBlock, CodeInlineBlock],
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
              admin: {
                description: {
                  en: "Optional FAQ shown after the article body.",
                  es: "FAQ opcional mostrado tras el cuerpo del artículo.",
                },
              },
              fields: [
                {
                  label: { en: "Heading", es: "Encabezado" },
                  localized: true,
                  name: "heading",
                  type: "text",
                },
                {
                  admin: { initCollapsed: true },
                  fields: [
                    {
                      label: { en: "Question", es: "Pregunta" },
                      localized: true,
                      name: "question",
                      required: true,
                      type: "text",
                    },
                    {
                      editor: generateRichText(),
                      label: { en: "Answer", es: "Respuesta" },
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
              label: { en: "FAQ", es: "FAQ" },
              name: "faq",
              type: "group",
            },
            {
              admin: {
                description: {
                  en: "Optional CTA band shown at the end of the post. Hidden when the heading is empty.",
                  es: "Banda CTA opcional al final de la publicación. Oculta si el encabezado está vacío.",
                },
              },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      admin: { width: "40%" },
                      label: { en: "Eyebrow", es: "Antetítulo" },
                      localized: true,
                      name: "eyebrow",
                      type: "text",
                    },
                    {
                      admin: { width: "60%" },
                      label: { en: "Heading", es: "Encabezado" },
                      localized: true,
                      name: "heading",
                      type: "text",
                    },
                  ],
                },
                {
                  label: { en: "Description", es: "Descripción" },
                  localized: true,
                  name: "description",
                  type: "textarea",
                },
                {
                  admin: { initCollapsed: true },
                  fields: (link() as GroupField).fields,
                  label: { en: "Actions", es: "Acciones" },
                  localized: true,
                  maxRows: 2,
                  name: "actions",
                  type: "array",
                },
              ],
              label: { en: "CTA", es: "CTA" },
              name: "cta",
              type: "group",
            },
          ],
          label: {
            en: "Content",
            es: "Contenido",
          },
        },
        {
          fields: generateSeoFields({ robotsDefault: "noindex" }),
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
        en: "Published At",
        es: "Publicado el",
      },
      name: "publishedAt",
      type: "date",
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
        description: {
          en: "Select up to 3 related posts. If fewer than 3 are selected, additional posts from the same categories will be shown automatically based on publish date.",
          es: "Selecciona hasta 3 publicaciones relacionadas. Si se seleccionan menos de 3, se mostrarán automáticamente publicaciones adicionales de las mismas categorías según la fecha de publicación.",
        },
        position: "sidebar",
      },
      filterOptions: ({ id }) => ({
        id: {
          not_in: [id],
        },
      }),
      hasMany: true,
      label: {
        en: "Related Posts",
        es: "Publicaciones relacionadas",
      },
      name: "relatedPosts",
      relationTo: BLOG_CONFIG.collection,
      type: "relationship",
    },
  ],
  hooks: {
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
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
