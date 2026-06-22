import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/core/lib/blockPreviewImage";
import { createLocalizedDefault } from "@/core/lib/createLocalizedDefault";
import { injectSection } from "@/fields/section/injectSection";

const fields: Field[] = [
  {
    admin: {
      components: {
        Field: "@/components/shared/components/CopyAiPromptButton#CopyAiPromptButton",
      },
    },
    name: "copyAiPrompt",
    type: "ui",
  },
  {
    admin: {
      description: {
        en: "Raw HTML rendered as-is on the page. Use for embeds and one-off markup.",
        es: "HTML sin procesar que se renderiza tal cual en la página. Úsalo para embeds y marcado puntual.",
      },
    },
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
