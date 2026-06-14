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
    defaultValue: "media-background",
    label: { en: "Variant", es: "Variante" },
    name: "variant",
    options: [
      { label: { en: "Media background", es: "Fondo multimedia" }, value: "media-background" },
      { label: { en: "Showcase window", es: "Ventana de producto" }, value: "showcase" },
      { label: { en: "Centered", es: "Centrado" }, value: "centered" },
    ],
    required: true,
    type: "select",
  },
  {
    defaultValue: createLocalizedDefault({ en: "New · Cadence 3.0", es: "Nuevo · Cadence 3.0" }),
    label: { en: "Badge", es: "Insignia" },
    localized: true,
    name: "badge",
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
  {
    fields: [
      {
        defaultValue: true,
        label: { en: "Enabled", es: "Habilitado" },
        name: "enabled",
        type: "checkbox",
      },
      {
        defaultValue: "black",
        label: { en: "Color", es: "Color" },
        name: "color",
        options: [
          { label: { en: "Black", es: "Negro" }, value: "black" },
          { label: { en: "White", es: "Blanco" }, value: "white" },
        ],
        type: "select",
      },
      {
        admin: {
          description: {
            en: "Overlay opacity (0-100)",
            es: "Opacidad del overlay (0-100)",
          },
        },
        defaultValue: 40,
        label: { en: "Opacity", es: "Opacidad" },
        max: 100,
        min: 0,
        name: "opacity",
        type: "number",
      },
    ],
    label: { en: "Overlay", es: "Overlay" },
    type: "group",
  },
];
