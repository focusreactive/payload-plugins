import type { Block, Field } from "payload";

import { DEFAULT_VALUES } from "@/core/constants/defaultValues";
import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/core/constants/mediaDefaults";
import { getBlockPreviewImage } from "@/core/lib/blockPreviewImage";
import {
  createLocalizedDefault,
  createLocalizedRichText,
} from "@/core/lib/createLocalizedDefault";
import { generateRichText } from "@/core/lib/generateRichText";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { embedSectionTab } from "@/fields/section/embedSectionTab";

const fields: Field[] = [
  {
    defaultValue: createLocalizedDefault(DEFAULT_VALUES.blocks.content.heading),
    label: {
      en: "Heading",
      es: "Encabezado",
    },
    localized: true,
    name: "heading",
    type: "text",
  },
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
    defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
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
      en: "Content",
      es: "Contenido",
    },
    localized: true,
    name: "content",
    required: true,
    type: "richText",
  },
];

export const ContentBlock: Block = {
  slug: "content",
  interfaceName: "ContentBlock",
  ...getBlockPreviewImage("Content Section"),
  labels: {
    plural: {
      en: "Content Sections",
      es: "Secciones de Contenido",
    },
    singular: {
      en: "Content Section",
      es: "Sección de Contenido",
    },
  },
  fields: embedSectionTab(fields),
};
