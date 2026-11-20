import { definePreview } from "@focus-reactive/payload-plugin-stacked-editing";
import type { Field } from "payload";

import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { imageField } from "@/lib/fields/imageField";
import { link } from "@/lib/fields/link";

const logosLabelField: Field = {
  defaultValue: createLocalizedDefault({
    en: "Trusted by 4,000+ teams in rhythm",
    es: "Con la confianza de más de 4.000 equipos en sintonía",
  }),
  label: { en: "Text above the logos", es: "Texto sobre los logos" },
  localized: true,
  name: "label",
  type: "text",
};

/** How the logo row looks. */
export const logosLookFields: Field[] = [
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
];

const logosItemsField: Field = {
  // Row cards show the logo and its name (its link text).
  admin: {
    custom: { preview: definePreview({ media: "image", title: "link.label" }) },
    initCollapsed: true,
  },
  fields: [imageField("image", { withAspectRatio: false }), link()],
  label: { en: "Logos", es: "Logos" },
  labels: {
    plural: { en: "Logos", es: "Logos" },
    singular: { en: "Logo", es: "Logo" },
  },
  localized: true,
  minRows: 1,
  name: "items",
  required: true,
  type: "array",
};

/** What the logo row says: the line above it, then the logos. */
export const logosContentFields: Field[] = [logosLabelField, logosItemsField];

/** Logos inside post text (no tabs there): content first, alignment after. */
export const logosFields: Field[] = [...logosContentFields, ...logosLookFields];
