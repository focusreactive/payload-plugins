import { MetaDescriptionField, MetaImageField, MetaTitleField, OverviewField, PreviewField } from "@payloadcms/plugin-seo/fields";
import type { Field } from "payload";

export const generateSeoFields = (): Field[] => [
  OverviewField({
    descriptionPath: "meta.description",
    imagePath: "meta.image",
    titlePath: "meta.title",
  }),
  MetaTitleField({
    hasGenerateFn: true,
  }),
  MetaImageField({
    relationTo: "media",
  }),
  MetaDescriptionField({
    hasGenerateFn: true,
  }),
  PreviewField({
    descriptionPath: "meta.description",
    hasGenerateFn: true,
    titlePath: "meta.title",
  }),
  {
    admin: {
      description: {
        en: "Allow search engines to index this page",
        es: "Permite a los motores de búsqueda indexar esta página",
      },
    },
    defaultValue: "index",
    label: {
      en: "Robots",
      es: "Robots",
    },
    name: "robots",
    options: [
      {
        label: {
          en: "Index",
          es: "Index",
        },
        value: "index",
      },
      {
        label: {
          en: "No Index",
          es: "No Index",
        },
        value: "noindex",
      },
    ],
    type: "select",
  },
];
