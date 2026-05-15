import type { Block, Field } from "payload";

import { CardsGridInlineBlock } from "@/blocks/CardsGrid/inlineConfig";
import { LinksListInlineBlock } from "@/blocks/LinksList/inlineConfig";
import { LogosInlineBlock } from "@/blocks/Logos/inlineConfig";
import { DEFAULT_VALUES } from "@/core/constants/defaultValues";
import { getBlockPreviewImage } from "@/core/lib/blockPreviewImage";
import { createLocalizedRichText } from "@/core/lib/createLocalizedDefault";
import { generateRichText } from "@/core/lib/generateRichText";
import { embedSectionTab } from "@/fields/section/embedSectionTab";

const fields: Field[] = [
  {
    defaultValue: createLocalizedRichText(DEFAULT_VALUES.richText.text),
    editor: generateRichText("default", {
      blocks: [CardsGridInlineBlock, LogosInlineBlock, LinksListInlineBlock],
    }),
    label: {
      en: "Text",
      es: "Texto",
    },
    localized: true,
    name: "text",
    required: true,
    type: "richText",
  },
];

export const TextSectionBlock: Block = {
  slug: "textSection",
  interfaceName: "TextSectionBlock",
  ...getBlockPreviewImage("Text Section"),
  labels: {
    plural: {
      en: "Text Sections",
      es: "Secciones de Texto",
    },
    singular: {
      en: "Text Section",
      es: "Sección de Texto",
    },
  },
  fields: embedSectionTab(fields),
};
