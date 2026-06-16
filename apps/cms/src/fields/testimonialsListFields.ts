import type { Field } from "payload";

import { DEFAULT_VALUES } from "@/core/constants/defaultValues";
import { sectionHeaderFields } from "@/fields/sectionHeader/sectionHeaderFields";

export const testimonialsListFields: Field[] = [
  ...sectionHeaderFields({
    headingDefault: DEFAULT_VALUES.blocks.testimonialsList.heading,
    descriptionDefault: DEFAULT_VALUES.blocks.testimonialsList.subheading,
  }),
  {
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
    minRows: 1,
    name: "testimonialItems",
    type: "array",
  },
  {
    admin: {
      description: {
        en: "The duration of the animation in seconds. Default is 60 seconds.",
        es: "La duración de la animación en segundos. Por defecto es 60 segundos.",
      },
      placeholder: "60",
    },
    defaultValue: 60,
    label: {
      en: "Animation duration (seconds)",
      es: "Duración de la animación (segundos)",
    },
    name: "duration",
    type: "number",
  },
  {
    defaultValue: true,
    label: { en: "Show Rating", es: "Mostrar Calificación" },
    name: "showRating",
    type: "checkbox",
  },
  {
    defaultValue: true,
    label: { en: "Show Avatar", es: "Mostrar Avatar" },
    name: "showAvatar",
    type: "checkbox",
  },
];
