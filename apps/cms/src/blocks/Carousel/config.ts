import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { generateRichText } from "@/lib/utils/generateRichText";
import { imageField } from "@/lib/fields/imageField";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";

const fields: Field[] = [
  sectionHeadingField(),
  {
    defaultValue: "slide",
    label: { en: "Slide transition", es: "Transición entre diapositivas" },
    name: "effect",
    options: [
      { label: { en: "Slide sideways", es: "Deslizar de lado" }, value: "slide" },
      { label: { en: "Fade in and out", es: "Fundido" }, value: "fade" },
    ],
    type: "select",
  },
  {
    admin: { initCollapsed: true },
    fields: [
      imageField("image", { withAspectRatio: false }),
      {
        editor: generateRichText(),
        label: { en: "Slide caption", es: "Texto de la diapositiva" },
        localized: true,
        name: "text",
        type: "richText",
      },
    ],
    label: { en: "Slides", es: "Diapositivas" },
    labels: {
      plural: { en: "Slides", es: "Diapositivas" },
      singular: { en: "Slide", es: "Diapositiva" },
    },
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
    plural: { en: "Image carousels", es: "Carruseles de imágenes" },
    singular: { en: "Image carousel", es: "Carrusel de imágenes" },
  },
  fields,
});
