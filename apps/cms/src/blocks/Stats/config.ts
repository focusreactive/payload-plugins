import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { injectSection } from "@/fields/section/injectSection";

const fields: Field[] = [
  {
    admin: { initCollapsed: true },
    defaultValue: createLocalizedDefault({
      en: [
        { label: "fewer status meetings", value: "70%" },
        { label: "tools consolidated into one", value: "4→1" },
        { label: "faster sprint planning", value: "2.5×" },
        { label: "teams shipping in rhythm", value: "4,000+" },
      ],
      es: [
        { label: "menos reuniones de estado", value: "70%" },
        { label: "herramientas consolidadas en una", value: "4→1" },
        { label: "planificación de sprints más rápida", value: "2.5×" },
        { label: "equipos publicando con ritmo", value: "4,000+" },
      ],
    }),
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
