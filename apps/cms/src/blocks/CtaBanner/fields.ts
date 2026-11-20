import type { Field, GroupField } from "payload";

import { link } from "@/lib/fields/link";

export const ctaBannerFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "50%" },
        label: { en: "Label above title", es: "Texto sobre el título" },
        localized: true,
        name: "eyebrow",
        type: "text",
      },
      {
        admin: { width: "50%" },
        defaultValue: "default",
        label: { en: "Color style", es: "Estilo de color" },
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
    label: { en: "Buttons", es: "Botones" },
    labels: {
      plural: { en: "Buttons", es: "Botones" },
      singular: { en: "Button", es: "Botón" },
    },
    localized: true,
    minRows: 1,
    name: "actions",
    type: "array",
  },
];
