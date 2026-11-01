import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";

const fields: Field[] = [
  sectionHeadingField({
    eyebrow: { en: "The Journal, monthly", es: "The Journal, mensual" },
    title: {
      en: "One thoughtful email a month. No noise.",
      es: "Un correo cuidado al mes. Sin ruido.",
    },
  }),
  {
    type: "row",
    fields: [
      {
        admin: { width: "50%" },
        defaultValue: createLocalizedDefault({ en: "you@team.com", es: "tu@equipo.com" }),
        label: { en: "Input placeholder", es: "Marcador del campo" },
        localized: true,
        name: "inputPlaceholder",
        required: true,
        type: "text",
      },
      {
        admin: { width: "50%" },
        defaultValue: createLocalizedDefault({ en: "Subscribe", es: "Suscribirse" }),
        label: { en: "Button label", es: "Etiqueta del botón" },
        localized: true,
        name: "buttonLabel",
        required: true,
        type: "text",
      },
    ],
  },
  {
    defaultValue: createLocalizedDefault({
      en: "No spam. Unsubscribe anytime.",
      es: "Sin spam. Cancela cuando quieras.",
    }),
    label: { en: "Disclaimer", es: "Aviso" },
    localized: true,
    name: "disclaimer",
    type: "text",
  },
];

export const NewsletterBlock: Block = injectSection({
  slug: "newsletter",
  interfaceName: "NewsletterBlock",
  ...getBlockPreviewImage("Newsletter"),
  labels: {
    plural: { en: "Newsletters", es: "Boletines" },
    singular: { en: "Newsletter", es: "Boletín" },
  },
  fields,
});
