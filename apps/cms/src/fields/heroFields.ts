import type { Field, GroupField } from "payload";

import { DEFAULT_VALUES } from "@/core/constants/defaultValues";
import { createLocalizedDefault, createLocalizedRichText } from "@/core/lib/createLocalizedDefault";
import { generateRichText } from "@/core/lib/generateRichText";
import { imageField } from "@/fields/imageField";
import { link } from "@/fields/link";

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
  {
    defaultValue: createLocalizedDefault({ en: "New · Cadence 3.0", es: "Nuevo · Cadence 3.0" }),
    label: { en: "Eyebrow", es: "Antetítulo" },
    localized: true,
    name: "eyebrow",
    type: "text",
  },
  {
    defaultValue: createLocalizedDefault(DEFAULT_VALUES.blocks.hero.title),
    label: { en: "Title", es: "Título" },
    localized: true,
    name: "title",
    type: "text",
  },
  {
    defaultValue: createLocalizedRichText(DEFAULT_VALUES.richText.text),
    editor: generateRichText("hero"),
    label: { en: "Rich Text", es: "Texto enriquecido" },
    localized: true,
    name: "richText",
    type: "richText",
  },
  {
    admin: {
      components: {
        RowLabel: "@/core/ui/components/RowLabel#RowLabel",
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
