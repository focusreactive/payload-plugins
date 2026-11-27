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
    admin: { language: "html" },
    defaultValue: createLocalizedDefault({
      en: "<p>Hello from Raw HTML</p>",
      es: "<p>Hola desde HTML sin procesar</p>",
    }),
    label: { en: "HTML code", es: "Código HTML" },
    localized: true,
    name: "html",
    required: true,
    type: "code",
  },
];

export const RawHtmlBlock: Block = injectSection({
  slug: "rawHtml",
  interfaceName: "RawHtmlBlock",
  ...getBlockPreviewImage("Custom HTML"),
  labels: {
    plural: { en: "Custom HTML", es: "HTML personalizado" },
    singular: { en: "Custom HTML", es: "HTML personalizado" },
  },
  fields,
});
