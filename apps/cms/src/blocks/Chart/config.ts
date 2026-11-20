import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";

const fields: Field[] = [
  sectionHeadingField(),
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
        label: { en: "Tab name", es: "Nombre de la pestaña" },
        localized: true,
        name: "label",
        required: true,
        type: "text",
      },
      {
        admin: { initCollapsed: true },
        fields: [
          {
            type: "row",
            fields: [
              {
                admin: { width: "50%" },
                label: { en: "Point name", es: "Nombre del punto" },
                name: "label",
                required: true,
                type: "text",
              },
              {
                admin: { width: "50%" },
                label: { en: "Value", es: "Valor" },
                name: "value",
                required: true,
                type: "number",
              },
            ],
          },
        ],
        labels: {
          plural: { en: "Data points", es: "Puntos de datos" },
          singular: { en: "Data point", es: "Punto de datos" },
        },
        minRows: 2,
        name: "dataPoints",
        required: true,
        type: "array",
      },
    ],
    labels: {
      plural: { en: "Time periods", es: "Periodos" },
      singular: { en: "Time period", es: "Periodo" },
    },
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
