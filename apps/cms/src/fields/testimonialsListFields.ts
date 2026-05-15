import type { Field } from "payload";

import { DEFAULT_VALUES } from "@/core/constants/defaultValues";
import { createLocalizedDefault } from "@/core/lib/createLocalizedDefault";

export const testimonialsListFields: Field[] = [
  {
    defaultValue: createLocalizedDefault(
      DEFAULT_VALUES.blocks.testimonialsList.heading
    ),
    label: { en: "Heading", es: "Encabezado" },
    localized: true,
    name: "heading",
    type: "text",
  },
  {
    defaultValue: createLocalizedDefault(
      DEFAULT_VALUES.blocks.testimonialsList.subheading
    ),
    label: { en: "Subheading", es: "Subencabezado" },
    localized: true,
    name: "subheading",
    type: "text",
  },
  {
    fields: [
      {
        name: "testimonial",
        type: "relationship",
        relationTo: "testimonials",
        required: true,
        label: { en: "Testimonial", es: "Testimonio" },
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
