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
  buttonsField({ maxRows: 2 }),
];

/** Where the image sits: above the text, or beside it on either side. */
const lookFields: Field[] = [
  {
    defaultValue: "stacked",
    label: {
      en: "Image position",
      es: "Posición de la imagen",
    },
    name: "layout",
    options: [
      {
        label: {
          en: "Wide image above the text",
          es: "Imagen ancha encima del texto",
        },
        value: "stacked",
      },
      {
        label: {
          en: "Image left, text right",
          es: "Imagen a la izquierda, texto a la derecha",
        },
        value: "image-text",
      },
      {
        label: {
          en: "Text left, image right",
          es: "Texto a la izquierda, imagen a la derecha",
        },
        value: "text-image",
      },
    ],
    required: true,
    type: "select",
  },
];

export const ContentBlock: Block = injectSection(
  {
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
  },
  { lookFields }
);
