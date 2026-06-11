import type { Field } from "payload";

import { createLocalizedDefault } from "@/core/lib/createLocalizedDefault";
import { imageField } from "@/fields/imageField";
import { link } from "@/fields/link";

export const logosFields: Field[] = [
  {
    defaultValue: createLocalizedDefault({
      en: "Trusted by 4,000+ teams in rhythm",
      es: "Con la confianza de más de 4.000 equipos en sintonía",
    }),
    label: { en: "Label", es: "Etiqueta" },
    localized: true,
    name: "label",
    type: "text",
  },
  {
    defaultValue: "center",
    label: { en: "Alignment", es: "Alineación" },
    name: "alignVariant",
    options: [
      { label: { en: "Left", es: "Izquierda" }, value: "left" },
      { label: { en: "Center", es: "Centro" }, value: "center" },
      { label: { en: "Right", es: "Derecha" }, value: "right" },
    ],
    type: "select",
  },
  {
    fields: [imageField(), link({ appearances: false })],
    label: { en: "Logo Items", es: "Logos" },
    localized: true,
    minRows: 1,
    name: "items",
    required: true,
    type: "array",
  },
];
