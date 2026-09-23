import type { Block, Field } from "payload";

import { link } from "@/lib/fields/link";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";

const fields: Field[] = [
  ...sectionHeaderFields(),
  {
    type: "row",
    fields: [
      {
        admin: {
          width: "50%",
          description: {
            en: "Figures in a row with a coloured rule, or in a grid beside an image.",
            es: "Cifras en fila con una línea de color, o en cuadrícula junto a una imagen.",
          },
        },
        defaultValue: "accentLine",
        label: { en: "Layout", es: "Diseño" },
        name: "layout",
        options: [
          { label: { en: "Row with accent line", es: "Fila con línea" }, value: "accentLine" },
          {
            label: { en: "Grid beside an image", es: "Cuadrícula con imagen" },
            value: "splitImage",
          },
        ],
        type: "select",
      },
      {
        admin: {
          width: "50%",
          condition: (_, siblingData) => siblingData?.layout === "splitImage",
        },
        label: { en: "Image", es: "Imagen" },
        name: "image",
        relationTo: "media",
        type: "upload",
      },
    ],
  },
  {
    admin: { initCollapsed: true },
    fields: [
      {
        type: "row",
        fields: [
          {
            admin: { width: "50%" },
            label: { en: "Value", es: "Valor" },
            localized: true,
            name: "value",
            required: true,
            type: "text",
          },
          {
            admin: { width: "50%" },
            label: { en: "Label", es: "Etiqueta" },
            localized: true,
            name: "label",
            required: true,
            type: "text",
          },
        ],
      },
      {
        admin: {
          description: {
            en: "One sentence saying where the figure comes from.",
            es: "Una frase que diga de dónde sale la cifra.",
          },
        },
        label: { en: "Description", es: "Descripción" },
        localized: true,
        name: "description",
        type: "textarea",
      },
      link({ appearances: false, required: false }),
    ],
    localized: true,
    maxRows: 4,
    minRows: 2,
    name: "items",
    required: true,
    type: "array",
  },
];

export const StatsBlock: Block = injectSection({
  slug: "stats",
  interfaceName: "StatsBlock",
  ...getBlockPreviewImage("Stats"),
  labels: {
    plural: { en: "Stats", es: "Estadísticas" },
    singular: { en: "Stats", es: "Estadísticas" },
  },
  fields,
});
