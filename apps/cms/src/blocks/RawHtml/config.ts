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
    admin: {
      description: "Raw HTML rendered as-is on the page. Use for embeds and one-off markup.",
    },
    defaultValue: createLocalizedDefault({
      en: "<p>Hello from Raw HTML</p>",
    }),
    label: "HTML",
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
    plural: "Raw HTML",
    singular: "Raw HTML",
  },
  fields,
});
