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
    label: "Effect",
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
      imageField("image", { withAspectRatio: false }),
      {
        editor: generateRichText(),
        label: "Slide Text",
        localized: true,
        name: "text",
        type: "richText",
      },
    ],
    label: "Slides",
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
    plural: "Carousels",
    singular: "Carousel",
  },
  fields,
});
