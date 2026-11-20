import type { Field } from "payload";

import { buttonsField } from "@/lib/fields/link";
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
  buttonsField({ minRows: 1 }),
];
