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
      description: {
        en: "0 turns automatic sliding off.",
        es: "0 desactiva el avance automático.",
      },
      placeholder: "60",
      width: "50%",
    },
    defaultValue: 60,
    label: {
      en: "Auto-advance (seconds for a full round)",
      es: "Avance automático (segundos por vuelta completa)",
    },
    name: "duration",
    type: "number",
  },
];
