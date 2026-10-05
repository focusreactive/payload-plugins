import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { injectSection } from "@/lib/fields/section/injectSection";

const fields: Field[] = [
  {
    admin: { initCollapsed: true },
    defaultValue: createLocalizedDefault({
      en: [
        { label: "Founded", value: "2007" },
        { label: "Certified quality management", value: "ISO 9001" },
        { label: "Certified information security", value: "ISO 27001" },
        { label: "Headquartered in", value: "Manchester" },
      ],
    }),
    fields: [
      {
        type: "row",
        fields: [
          {
            admin: { width: "50%" },
            label: "Value",
            localized: true,
            name: "value",
            required: true,
            type: "text",
          },
          {
            admin: { width: "50%" },
            label: "Label",
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
    plural: "Stats",
    singular: "Stats",
  },
  fields,
});
