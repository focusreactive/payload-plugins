import type { Block } from "payload";

import { siteButton } from "@/lib/fields/site/siteLink";

/** A button between two paragraphs of an article, for example a link to the booking page. */
export const ArticleButtonBlock: Block = {
  fields: [
    siteButton({
      description: "The button's text and where it goes. Empty text hides it.",
    }),
    {
      admin: {
        description: {
          en: "Where the button sits in the line.",
          es: "Dónde se sitúa el botón en la línea.",
        },
      },
      defaultValue: "left",
      label: { en: "Position", es: "Posición" },
      name: "align",
      options: [
        { label: { en: "Left", es: "Izquierda" }, value: "left" },
        { label: { en: "Centre", es: "Centro" }, value: "center" },
      ],
      type: "select",
    },
  ],
  interfaceName: "ArticleButtonBlock",
  labels: {
    plural: { en: "Buttons", es: "Botones" },
    singular: { en: "Button", es: "Botón" },
  },
  slug: "artButton",
};
