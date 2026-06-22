import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { testimonialsListFields } from "@/lib/fields/testimonialsListFields";

export const TestimonialsListBlock: Block = injectSection({
  slug: "testimonialsList",
  interfaceName: "TestimonialsListBlock",
  ...getBlockPreviewImage("Testimonials"),
  labels: {
    plural: { en: "Testimonials", es: "Testimonios" },
    singular: { en: "Testimonials", es: "Testimonios" },
  },
  fields: [...testimonialsListFields],
});
