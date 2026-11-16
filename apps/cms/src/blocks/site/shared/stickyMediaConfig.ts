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
import type { Block, GroupField } from "payload";

import { headingRichText } from "@/lib/fields/site/richText";
import { ROUTED_COLLECTIONS, siteButton } from "@/lib/fields/site/siteLink";

import { rowTitle, siteBlock } from "../shared";

const chapterButton: GroupField = {
  ...(siteButton() as GroupField),
  admin: {
    description: {
      en: "A button under the chapter's text. Empty text hides it.",
      es: "Un botón bajo el texto del capítulo. Sin texto no se muestra.",
    },
    hideGutter: true,
  },
  label: { en: "Button", es: "Botón" },
};

export const StickyMediaBlock: Block = {
  ...siteBlock({
    fields: [
      {
        admin: {
          ...rowTitle("image.filename", "Chapter"),
          description: {
            en: "The article, one row per chapter. On wide screens each chapter's picture stays beside the text while the chapter scrolls past.",
            es: "El artículo, una fila por capítulo. En pantallas anchas la imagen de cada capítulo queda junto al texto mientras el capítulo pasa.",
          },
        },
        fields: [
          {
            admin: {
              description: {
                en: "The picture of this chapter. Phones show it above the text.",
                es: "La imagen de este capítulo. En el móvil aparece sobre el texto.",
              },
            },
            label: { en: "Picture", es: "Imagen" },
            name: "image",
            relationTo: "media",
            type: "upload",
          },
          {
            admin: {
              description: {
                en: "Leaves the picture out on phones, for example when it repeats the one above.",
                es: "Oculta la imagen en el móvil, por ejemplo cuando repite la anterior.",
              },
            },
            defaultValue: false,
            label: { en: "Hide the picture on phones", es: "Ocultar la imagen en el móvil" },
            name: "hideOnMobile",
            type: "checkbox",
          },
          {
            admin: {
              description: {
                en: "The chapter's text: headings, paragraphs, lists and links. Use Heading 1 only for the page title in the first chapter.",
                es: "El texto del capítulo: títulos, párrafos, listas y enlaces. Use el título 1 solo para el título de la página en el primer capítulo.",
              },
            },
            editor: lexicalEditor({
              features: () => [
                ParagraphFeature(),
                BoldFeature(),
                ItalicFeature(),
                UnderlineFeature(),
                HeadingFeature({ enabledHeadingSizes: ["h1", "h2"] }),
                UnorderedListFeature(),
                OrderedListFeature(),
                LinkFeature({ enabledCollections: [...ROUTED_COLLECTIONS] }),
                InlineToolbarFeature(),
              ],
            }),
            label: { en: "Text", es: "Texto" },
            name: "text",
            required: true,
            type: "richText",
          },
          chapterButton,
          {
            ...headingRichText({
              description: "",
              label: "Small print",
              name: "note",
            }),
            admin: {
              description: {
                en: "One line under the button, for example *Subject to insurance eligibility. Set words in italics as the site does. Empty hides it.",
                es: "Una línea bajo el botón, por ejemplo *Sujeto a elegibilidad del seguro. Ponga en cursiva lo que la web muestra en cursiva. Vacío no se muestra.",
              },
            },
            label: { en: "Small print", es: "Letra pequeña" },
          },
          {
            admin: {
              description: {
                en: "The size of the small print.",
                es: "El tamaño de la letra pequeña.",
              },
            },
            defaultValue: "regular",
            label: { en: "Small print size", es: "Tamaño de la letra pequeña" },
            name: "noteSize",
            options: [
              { label: { en: "Text size", es: "Tamaño del texto" }, value: "regular" },
              { label: { en: "Smaller", es: "Más pequeña" }, value: "small" },
            ],
            type: "select",
          },
        ],
        label: { en: "Chapters", es: "Capítulos" },
        labels: {
          plural: { en: "Chapters", es: "Capítulos" },
          singular: { en: "Chapter", es: "Capítulo" },
        },
        minRows: 1,
        name: "chapters",
        type: "array",
      },
    ],
    interfaceName: "StickyMediaBlock",
    label: "Article with sticky pictures",
    slug: "stickyMedia",
  }),
  // The slug-derived table names push nested enum names past Postgres's 63-character limit.
  dbName: "stky",
  labels: {
    plural: { en: "Article with sticky pictures", es: "Artículo con imágenes fijas" },
    singular: { en: "Article with sticky pictures", es: "Artículo con imágenes fijas" },
  },
};
