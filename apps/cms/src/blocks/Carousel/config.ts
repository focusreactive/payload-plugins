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
    label: { en: "Transition", es: "Transición" },
    name: "effect",
    options: [
      { label: { en: "Slide", es: "Deslizar" }, value: "slide" },
      { label: { en: "Fade", es: "Fundido" }, value: "fade" },
    ],
    type: "select",
  },
  {
    admin: { initCollapsed: true },
    fields: [
      imageField("image", { withAspectRatio: false }),
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
