import type { Block, Field, GroupField } from "payload";

import { DEFAULT_VALUES } from "@/core/constants/defaultValues";
import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/core/constants/mediaDefaults";
import { getBlockPreviewImage } from "@/core/lib/blockPreviewImage";
import { createLocalizedRichText } from "@/core/lib/createLocalizedDefault";
import { generateRichText } from "@/core/lib/generateRichText";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/fields/link";
import { embedSectionTab } from "@/fields/section/embedSectionTab";
import { sectionHeaderFields } from "@/fields/sectionHeader/sectionHeaderFields";

const fields: Field[] = [
  ...sectionHeaderFields({ headingDefault: DEFAULT_VALUES.blocks.content.heading }),
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
  {
    admin: {
      components: { RowLabel: "@/core/ui/components/RowLabel#RowLabel" },
      initCollapsed: true,
    },
    fields: (link() as GroupField).fields,
    label: { en: "Actions", es: "Acciones" },
    localized: true,
    maxRows: 2,
    name: "actions",
    type: "array",
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
