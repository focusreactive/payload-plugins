import type { Field } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { imageField } from "@/lib/fields/imageField";
import { buttonsField } from "@/lib/fields/link";
import type { LinkAppearances } from "@/lib/fields/link";
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";

const defaultHeroLinkItem = (label: string, appearance: LinkAppearances) => ({
  link: {
    appearance,
    label,
    newTab: false,
    type: "custom" as const,
    url: "https://www.google.com",
  },
});

export const heroFields: Field[] = [
  sectionHeadingField({
    eyebrow: { en: "New · Cadence 3.0", es: "Nuevo · Cadence 3.0" },
    title: DEFAULT_VALUES.blocks.hero.title,
    description: DEFAULT_VALUES.blocks.hero.description,
  }),
  {
    defaultValue: "showcase",
    label: { en: "Layout", es: "Diseño" },
    name: "variant",
    options: [
      {
        label: { en: "Text over a background image", es: "Texto sobre una imagen de fondo" },
        value: "showcase",
      },
      {
        label: { en: "Centered text, no image", es: "Texto centrado, sin imagen" },
        value: "centered",
      },
    ],
    required: true,
    type: "select",
  },
  {
    // The hero fills its background with the image, so a shape choice would change nothing.
    ...imageField("image", { hideAspectRatio: true, required: false, withDefaultMedia: true }),
    admin: {
      condition: (_, siblingData) => siblingData?.variant !== "centered",
    },
  },
  buttonsField({
    defaultValue: createLocalizedDefault({
      en: [
        defaultHeroLinkItem("Start free", "default"),
        defaultHeroLinkItem("Watch the tour", "link"),
      ],
      es: [
        defaultHeroLinkItem("Comenzar gratis", "default"),
        defaultHeroLinkItem("Ver el tour", "link"),
      ],
    }),
    maxRows: 2,
  }),
];
