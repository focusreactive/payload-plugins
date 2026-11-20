import type { Field } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { imageField } from "@/lib/fields/imageField";
import { buttonsField } from "@/lib/fields/link";
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";

const defaultHeroLinkItem = (label: string, appearance: "accent" | "outline") => ({
  link: {
    appearance,
    label,
    newTab: false,
    type: "custom" as const,
    url: "https://www.google.com",
  },
});

export const heroFields: Field[] = [
  {
    defaultValue: "showcase",
    label: { en: "Layout", es: "Diseño" },
    name: "variant",
    options: [
      { label: { en: "Text with image", es: "Texto con imagen" }, value: "showcase" },
      {
        label: { en: "Centered text, no image", es: "Texto centrado, sin imagen" },
        value: "centered",
      },
    ],
    required: true,
    type: "select",
  },
  sectionHeadingField({
    eyebrow: { en: "New · Cadence 3.0", es: "Nuevo · Cadence 3.0" },
    title: DEFAULT_VALUES.blocks.hero.title,
    description: DEFAULT_VALUES.blocks.hero.description,
  }),
  buttonsField({
    defaultValue: createLocalizedDefault({
      en: [
        defaultHeroLinkItem("Start free", "accent"),
        defaultHeroLinkItem("Watch the tour", "outline"),
      ],
      es: [
        defaultHeroLinkItem("Comenzar gratis", "accent"),
        defaultHeroLinkItem("Ver el tour", "outline"),
      ],
    }),
    maxRows: 2,
  }),
  {
    ...imageField("image", { required: false, withDefaultMedia: true }),
    admin: {
      condition: (_, siblingData) => siblingData?.variant !== "centered",
    },
  },
];
