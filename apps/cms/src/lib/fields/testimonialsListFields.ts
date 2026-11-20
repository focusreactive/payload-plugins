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
        en: "Seconds the slider takes to auto-advance through every testimonial. 0 turns autoplay off.",
        es: "Segundos que tarda el carrusel en recorrer todos los testimonios. 0 desactiva la reproducción automática.",
      },
      placeholder: "60",
    },
    defaultValue: 60,
    label: {
      en: "Autoplay cycle (seconds)",
      es: "Ciclo de reproducción automática (segundos)",
    },
    name: "duration",
    type: "number",
  },
];
