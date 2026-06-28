import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { generateRichText } from "@/lib/utils/generateRichText";
import { imageField } from "@/lib/fields/imageField";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";

const fields: Field[] = [
  ...sectionHeaderFields(),
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
    admin: { initCollapsed: true },
    fields: [
      imageField(),
      {
        editor: generateRichText(),
        label: { en: "Slide Text", es: "Texto de la diapositiva" },
        localized: true,
        name: "text",
        type: "richText",
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

export const CarouselBlock: Block = injectSection({
  slug: "carousel",
  interfaceName: "CarouselBlock",
  ...getBlockPreviewImage("Carousel"),
  labels: {
    plural: { en: "Carousels", es: "Carruseles" },
    singular: { en: "Carousel", es: "Carrusel" },
  },
  fields,
});
