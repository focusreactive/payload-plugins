import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { injectSection } from "@/lib/fields/section/injectSection";

const fields: Field[] = [
  {
    admin: {
      components: {
        Field: "@/components/admin/CopyAiPromptButton#CopyAiPromptButton",
      },
    },
    name: "copyAiPrompt",
    type: "ui",
  },
  {
    defaultValue: createLocalizedDefault({
      en: "<p>Hello from Raw HTML</p>",
      es: "<p>Hola desde HTML sin procesar</p>",
    }),
    label: { en: "HTML", es: "HTML" },
    localized: true,
    name: "html",
    required: true,
    type: "textarea",
  },
];

export const RawHtmlBlock: Block = injectSection({
  slug: "rawHtml",
  interfaceName: "RawHtmlBlock",
  ...getBlockPreviewImage("Raw HTML"),
  labels: {
    plural: { en: "Raw HTML", es: "HTML sin procesar" },
    singular: { en: "Raw HTML", es: "HTML sin procesar" },
  },
  fields,
});
