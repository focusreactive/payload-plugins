import type { Field } from "payload";

import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { imageField } from "@/lib/fields/imageField";
import { link } from "@/lib/fields/link";

export const logosFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "60%" },
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
        admin: { width: "40%" },
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
    ],
  },
  {
    admin: { initCollapsed: true },
    fields: [imageField(), link({ appearances: false })],
    label: { en: "Logo Items", es: "Logos" },
    localized: true,
    minRows: 1,
    name: "items",
    required: true,
    type: "array",
  },
];
