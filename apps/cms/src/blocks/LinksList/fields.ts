import type { Field } from "payload";

import { link } from "@/fields/link";

export const linksListFields: Field[] = [
  {
    defaultValue: "left",
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
    fields: [link()],
    label: { en: "Links", es: "Enlaces" },
    localized: true,
    minRows: 1,
    name: "links",
    required: true,
    type: "array",
  },
];
