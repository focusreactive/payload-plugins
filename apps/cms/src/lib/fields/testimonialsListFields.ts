import type { Field } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";

export const testimonialsListFields: Field[] = [
  sectionHeadingField({
    title: DEFAULT_VALUES.blocks.testimonialsList.heading,
    description: DEFAULT_VALUES.blocks.testimonialsList.subheading,
  }),
  {
    admin: { initCollapsed: true },
    fields: [
      {
        label: { en: "Testimonial", es: "Testimonio" },
        name: "testimonial",
        relationTo: "testimonials",
        required: true,
        type: "relationship",
      },
    ],
    label: { en: "Testimonials", es: "Testimonios" },
    labels: {
      plural: { en: "Testimonials", es: "Testimonios" },
      singular: { en: "Testimonial", es: "Testimonio" },
    },
    minRows: 1,
    name: "testimonialItems",
    type: "array",
  },
];

/** How the testimonials show: rating, photo, scroll speed. */
export const testimonialsListLookFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "50%" },
        defaultValue: true,
        label: { en: "Show star rating", es: "Mostrar valoración" },
        name: "showRating",
        type: "checkbox",
      },
      {
        admin: { width: "50%" },
        defaultValue: true,
        label: { en: "Show photo", es: "Mostrar foto" },
        name: "showAvatar",
        type: "checkbox",
      },
    ],
  },
  {
    admin: {
      placeholder: "60",
      width: "50%",
    },
    defaultValue: 60,
    label: {
      en: "Scroll speed (seconds per full loop)",
      es: "Velocidad de desplazamiento (segundos por vuelta)",
    },
    name: "duration",
    type: "number",
  },
];
