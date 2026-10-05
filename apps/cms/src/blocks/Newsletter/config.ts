import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { injectSection } from "@/lib/fields/section/injectSection";

const fields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "40%" },
        defaultValue: createLocalizedDefault({
          en: "Newsletter",
        }),
        label: "Eyebrow",
        localized: true,
        name: "eyebrow",
        type: "text",
      },
      {
        admin: { width: "60%" },
        defaultValue: createLocalizedDefault({
          en: "News from the engineers, once a month",
        }),
        label: "Heading",
        localized: true,
        name: "heading",
        required: true,
        type: "text",
      },
    ],
  },
  {
    type: "row",
    fields: [
      {
        admin: { width: "50%" },
        defaultValue: createLocalizedDefault({ en: "you@company.com" }),
        label: "Input placeholder",
        localized: true,
        name: "inputPlaceholder",
        required: true,
        type: "text",
      },
      {
        admin: { width: "50%" },
        defaultValue: createLocalizedDefault({ en: "Subscribe" }),
        label: "Button label",
        localized: true,
        name: "buttonLabel",
        required: true,
        type: "text",
      },
    ],
  },
  {
    defaultValue: createLocalizedDefault({
      en: "One email a month. Unsubscribe anytime.",
    }),
    label: "Disclaimer",
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
    plural: "Newsletters",
    singular: "Newsletter",
  },
  fields,
});
