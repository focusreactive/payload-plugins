import type { Field, GroupField } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { imageField } from "@/lib/fields/imageField";
import { link } from "@/lib/fields/link";
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";

const defaultHeroLinkItem = (label: string) => ({
  appearance: "default" as const,
  label,
  newTab: false,
  type: "custom" as const,
  url: "https://www.google.com",
});

export const heroFields: Field[] = [
  {
    defaultValue: "showcase",
    label: { en: "Variant", es: "Variante" },
    name: "variant",
    options: [
      { label: { en: "Showcase window", es: "Ventana de producto" }, value: "showcase" },
      { label: { en: "Centered", es: "Centrado" }, value: "centered" },
    ],
    required: true,
    type: "select",
  },
  sectionHeadingField({
    eyebrow: { en: "New · Cadence 3.0", es: "Nuevo · Cadence 3.0" },
    title: DEFAULT_VALUES.blocks.hero.title,
    description: DEFAULT_VALUES.blocks.hero.description,
  }),
  {
    admin: {
      components: {
        RowLabel: "@/components/admin/RowLabel#RowLabel",
      },
      initCollapsed: true,
    },
    defaultValue: createLocalizedDefault({
      en: [
        { ...defaultHeroLinkItem("Start free"), appearance: "accent" as const },
        { ...defaultHeroLinkItem("Watch the tour"), appearance: "outline" as const },
      ],
      es: [
        { ...defaultHeroLinkItem("Comenzar gratis"), appearance: "accent" as const },
        { ...defaultHeroLinkItem("Ver el tour"), appearance: "outline" as const },
      ],
    }),
    fields: (link() as GroupField).fields,
    label: { en: "Actions", es: "Acciones" },
    localized: true,
    maxRows: 2,
    name: "actions",
    type: "array",
  },
  {
    ...imageField("image", { required: false, withDefaultMedia: true }),
    admin: {
      condition: (_, siblingData) => siblingData?.variant !== "centered",
    },
  },
];
