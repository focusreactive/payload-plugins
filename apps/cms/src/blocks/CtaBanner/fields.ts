import type { Field, GroupField } from "payload";

import { link } from "@/lib/fields/link";
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";

export const ctaBannerFields: Field[] = [
  sectionHeadingField(),
  {
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
