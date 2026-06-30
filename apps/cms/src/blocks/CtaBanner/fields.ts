import type { Field, GroupField } from "payload";

import { link } from "@/lib/fields/link";

export const ctaBannerFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "50%" },
        label: { en: "Eyebrow", es: "Antetítulo" },
        localized: true,
        name: "eyebrow",
        type: "text",
      },
      {
        admin: {
          description: {
            en: "Visual emphasis of the banner.",
            es: "Énfasis visual del banner.",
          },
          width: "50%",
        },
        defaultValue: "default",
        label: { en: "Variant", es: "Variante" },
        name: "variant",
        options: [
          { label: { en: "Default", es: "Predeterminado" }, value: "default" },
          { label: { en: "Accent (lime)", es: "Acento (lima)" }, value: "accent" },
          { label: { en: "Dark", es: "Oscuro" }, value: "dark" },
        ],
        type: "select",
      },
    ],
  },
  {
    label: { en: "Heading", es: "Encabezado" },
    localized: true,
    name: "heading",
    type: "text",
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
    minRows: 1,
    name: "actions",
    type: "array",
  },
];
