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
    minRows: 1,
    name: "testimonialItems",
    type: "array",
  },
  {
    type: "row",
    fields: [
      {
        admin: { width: "50%" },
        defaultValue: true,
        label: { en: "Show Rating", es: "Mostrar Calificación" },
        name: "showRating",
        type: "checkbox",
      },
      {
        admin: { width: "50%" },
        defaultValue: true,
        label: { en: "Show Avatar", es: "Mostrar Avatar" },
        name: "showAvatar",
        type: "checkbox",
      },
    ],
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
];
