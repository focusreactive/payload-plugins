import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/core/lib/blockPreviewImage";
import { createLocalizedDefault } from "@/core/lib/createLocalizedDefault";
import { injectSection } from "@/fields/section/injectSection";
import { sectionHeaderFields } from "@/fields/sectionHeader/sectionHeaderFields";

const fields: Field[] = [
  ...sectionHeaderFields(),
  {
    type: "row",
    fields: [
      {
        admin: { width: "50%" },
        defaultValue: createLocalizedDefault({ en: "Total Visitors", es: "Visitantes totales" }),
        label: { en: "Title", es: "Título" },
        localized: true,
        name: "title",
        required: true,
        type: "text",
      },
      {
        admin: { width: "50%" },
        defaultValue: createLocalizedDefault({
          en: "Total for the last 3 months",
          es: "Total de los últimos 3 meses",
        }),
        label: { en: "Subtitle", es: "Subtítulo" },
        localized: true,
        name: "subtitle",
        type: "text",
      },
    ],
  },
  {
    admin: {
      description: {
        en: "Each range becomes a tab. The first range is shown by default.",
        es: "Cada rango se convierte en una pestaña. El primero se muestra por defecto.",
      },
      initCollapsed: true,
    },
    fields: [
      {
        label: { en: "Label", es: "Etiqueta" },
        localized: true,
        name: "label",
        required: true,
        type: "text",
      },
      {
        fields: [
          {
            type: "row",
            fields: [
              { admin: { width: "50%" }, label: { en: "Label", es: "Etiqueta" }, name: "label", required: true, type: "text" },
              { admin: { width: "50%" }, label: { en: "Value", es: "Valor" }, name: "value", required: true, type: "number" },
            ],
          },
        ],
        minRows: 2,
        name: "dataPoints",
        required: true,
        type: "array",
      },
    ],
    minRows: 1,
    name: "ranges",
    required: true,
    type: "array",
  },
];

export const ChartBlock: Block = injectSection({
  slug: "chart",
  interfaceName: "ChartBlock",
  ...getBlockPreviewImage("Chart"),
  labels: {
    plural: { en: "Charts", es: "Gráficos" },
    singular: { en: "Chart", es: "Gráfico" },
  },
  fields,
});
