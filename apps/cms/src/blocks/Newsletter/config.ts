import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/core/lib/blockPreviewImage";
import { createLocalizedDefault } from "@/core/lib/createLocalizedDefault";
import { embedSectionTab } from "@/fields/section/embedSectionTab";

const fields: Field[] = [
  {
    defaultValue: createLocalizedDefault({ en: "The Journal, monthly", es: "The Journal, mensual" }),
    label: { en: "Badge", es: "Insignia" },
    localized: true,
    name: "badge",
    type: "text",
  },
  {
    defaultValue: createLocalizedDefault({ en: "One thoughtful email a month. No noise.", es: "Un correo cuidado al mes. Sin ruido." }),
    label: { en: "Heading", es: "Encabezado" },
    localized: true,
    name: "heading",
    required: true,
    type: "text",
  },
  {
    defaultValue: createLocalizedDefault({ en: "you@team.com", es: "tu@equipo.com" }),
    label: { en: "Input placeholder", es: "Marcador del campo" },
    localized: true,
    name: "inputPlaceholder",
    required: true,
    type: "text",
  },
  {
    defaultValue: createLocalizedDefault({ en: "Subscribe", es: "Suscribirse" }),
    label: { en: "Button label", es: "Etiqueta del botón" },
    localized: true,
    name: "buttonLabel",
    required: true,
    type: "text",
  },
  {
    defaultValue: createLocalizedDefault({ en: "No spam. Unsubscribe anytime.", es: "Sin spam. Cancela cuando quieras." }),
    label: { en: "Disclaimer", es: "Aviso" },
    localized: true,
    name: "disclaimer",
    type: "text",
  },
];

export const NewsletterBlock: Block = {
  slug: "newsletter",
  interfaceName: "NewsletterBlock",
  ...getBlockPreviewImage("Newsletter"),
  labels: {
    plural: { en: "Newsletters", es: "Boletines" },
    singular: { en: "Newsletter", es: "Boletín" },
  },
  fields: embedSectionTab(fields),
};
