import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/core/lib/blockPreviewImage";
import { generateRichText } from "@/core/lib/generateRichText";
import { imageField } from "@/fields/imageField";
import { embedSectionTab } from "@/fields/section/embedSectionTab";

const fields: Field[] = [
  {
    editor: generateRichText(),
    label: { en: "Intro Text", es: "Texto introductorio" },
    localized: true,
    name: "text",
    type: "richText",
  },
  {
    defaultValue: "slide",
    label: { en: "Effect", es: "Efecto" },
    name: "effect",
    options: [
      { label: "Slide", value: "slide" },
      { label: "Fade", value: "fade" },
      { label: "Cube", value: "cube" },
      { label: "Flip", value: "flip" },
      { label: "Coverflow", value: "coverflow" },
      { label: "Cards", value: "cards" },
    ],
    type: "select",
  },
  {
    fields: [
      imageField(),
      {
        name: "text",
        type: "richText",
        editor: generateRichText(),
        label: { en: "Slide Text", es: "Texto de la diapositiva" },
        localized: true,
      },
    ],
    label: { en: "Slides", es: "Diapositivas" },
    localized: true,
    minRows: 1,
    name: "slides",
    required: true,
    type: "array",
  },
];

export const CarouselBlock: Block = {
  slug: "carousel",
  interfaceName: "CarouselBlock",
  ...getBlockPreviewImage("Carousel"),
  labels: {
    plural: { en: "Carousels", es: "Carruseles" },
    singular: { en: "Carousel", es: "Carrusel" },
  },
  fields: embedSectionTab(fields),
};
