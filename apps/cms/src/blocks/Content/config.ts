import type { Block, Field } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedRichText } from "@/lib/utils/createLocalizedDefault";
import { generateRichText } from "@/lib/utils/generateRichText";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { buttonsField } from "@/lib/fields/link";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";

const fields: Field[] = [
  sectionHeadingField({ title: DEFAULT_VALUES.blocks.content.heading }),
  {
    defaultValue: "image-text",
    label: {
      en: "Layout",
      es: "Diseño",
    },
    name: "layout",
    options: [
      {
        label: {
          en: "50/50 Image + Text",
          es: "50/50 Imagen + Texto",
        },
        value: "image-text",
      },
      {
        label: {
          en: "50/50 Text + Image",
          es: "50/50 Texto + Imagen",
        },
        value: "text-image",
      },
    ],
    required: true,
    type: "select",
  },
  {
    defaultValue: async () => getDefaultMediaId(),
    label: {
      en: "Image",
      es: "Imagen",
    },
    name: "image",
    relationTo: "media",
    required: true,
    type: "upload",
  },
  {
    defaultValue: createLocalizedRichText(DEFAULT_VALUES.richText.content),
    editor: generateRichText(),
    label: {
      en: "Text",
      es: "Texto",
    },
    localized: true,
    name: "content",
    required: true,
    type: "richText",
  },
  buttonsField({ maxRows: 2 }),
];

export const ContentBlock: Block = injectSection({
  slug: "content",
  interfaceName: "ContentBlock",
  ...getBlockPreviewImage("Content Section"),
  labels: {
    plural: {
      en: "Text and image",
      es: "Texto e imagen",
    },
    singular: {
      en: "Text and image",
      es: "Texto e imagen",
    },
  },
  fields,
});
