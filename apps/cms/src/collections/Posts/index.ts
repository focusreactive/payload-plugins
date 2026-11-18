import type { CollectionConfig, GroupField } from "payload";

import { CardsGridInlineBlock } from "@/blocks/CardsGrid/inlineConfig";
import { CodeInlineBlock } from "@/blocks/Code/inlineConfig";
import { CtaBannerInlineBlock } from "@/blocks/CtaBanner/inlineConfig";
import { LogosInlineBlock } from "@/blocks/Logos/inlineConfig";
import { rowTitle } from "@/blocks/site/shared";
import { siteBlocks } from "@/blocks/siteBlocks";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import {
  createLiveBeforeDocumentControls,
  createLivePreviewVersions,
} from "@/lib/config/livePreview";
import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { anyone, author, authorDraft, or, user, superAdmin } from "@/lib/access";
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
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";
import { createSharedSlugField } from "@/lib/fields/slugField";
import { reviewFields } from "@/lib/review/fields";
import { enforceReviewRules, notifyReviewChange } from "@/lib/review/hooks";

import { ArticleButtonBlock } from "./ArticleButtonBlock";
import { computeReadingTime } from "./hooks/computeReadingTime";
import { revalidateDelete, revalidatePost } from "./hooks/revalidatePost";

export const Posts: CollectionConfig<"posts"> = {
  access: {
    create: or(superAdmin, user, authorDraft),
    delete: or(superAdmin, user, author),
    read: anyone,
    update: or(superAdmin, user, authorDraft),
  },
  admin: {
    components: {
      edit: {
        beforeDocumentControls: createLiveBeforeDocumentControls(),
        PreviewButton: "/components/admin/VisualPreviewButton#VisualPreviewButton",
      },
    },
    defaultColumns: ["title", "categories", "publishedAt", "_status"],
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
    listSearchableFields: ["title", "slug"],
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
                blocks: [
                  CardsGridInlineBlock,
                  LogosInlineBlock,
                  CodeInlineBlock,
                  CtaBannerInlineBlock,
                  ArticleButtonBlock,
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
              admin: {
                description: {
                  en: "Optional FAQ shown after the article body.",
                  es: "FAQ opcional mostrado tras el cuerpo del artículo.",
                },
              },
              fields: [
                sectionHeadingField(),
                {
                  admin: rowTitle("question", "Question"),
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
                // The site's article template never renders this band; the Sections field holds the real one.
                hidden: true,
              },
              fields: [
                sectionHeadingField(),
                {
                  admin: rowTitle("label", "Button"),
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
            {
              admin: {
                description: {
                  en: "The sections under the article, top to bottom, for example a call to action band or an articles slider.",
                  es: "Las secciones bajo el artículo, de arriba abajo, por ejemplo una banda de llamada a la acción o un carrusel de artículos.",
                },
                initCollapsed: true,
              },
              blocks: siteBlocks,
              label: { en: "Sections", es: "Secciones" },
              labels: {
                plural: { en: "Sections", es: "Secciones" },
                singular: { en: "Section", es: "Sección" },
              },
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
    ...reviewFields(),
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
        description:
          "The doctor who medically reviewed the article. Shown with the doctor's photo on the article and its cards.",
        position: "sidebar",
      },
      label: "Medically reviewed by",
      name: "reviewedBy",
      relationTo: "doctors",
      type: "relationship",
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
      label: {
        en: "Published At",
        es: "Publicado el",
      },
      name: "publishedAt",
      type: "date",
    },
    {
      admin: {
        date: { pickerAppearance: "dayOnly" },
        description: {
          en: "The date of the last review of the article. When set, the article shows Updated with this date instead of the publish date.",
          es: "La fecha de la última revisión del artículo. Si se indica, el artículo muestra Actualizado con esta fecha en lugar de la fecha de publicación.",
        },
        position: "sidebar",
      },
      label: { en: "Updated on", es: "Actualizado el" },
      name: "updatedDate",
      type: "date",
    },
    {
      admin: {
        position: "sidebar",
        readOnly: true,
        description: {
          en: "Estimated reading time in minutes. Auto-calculated from the content on save.",
          es: "Tiempo de lectura estimado en minutos. Se calcula automáticamente al guardar.",
        },
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
        description: {
          en: "The reading time shown on the article and its cards, in minutes. Empty shows the estimate above.",
          es: "El tiempo de lectura que se muestra en el artículo y sus tarjetas, en minutos. Vacío muestra la estimación de arriba.",
        },
        position: "sidebar",
      },
      label: { en: "Reading time shown (min)", es: "Tiempo de lectura mostrado (min)" },
      localized: true,
      min: 1,
      name: "readingTimeOverride",
      type: "number",
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
    beforeChange: [computeReadingTime, enforceReviewRules],
    afterChange: [revalidatePost, notifyReviewChange],
    afterDelete: [revalidateDelete],
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
