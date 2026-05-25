import type { Field, GroupField } from "payload";

import { DEFAULT_VALUES } from "@/core/constants/defaultValues";
import {
  createLocalizedDefault,
  createLocalizedRichText,
} from "@/core/lib/createLocalizedDefault";
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
    defaultValue: createLocalizedDefault(
      DEFAULT_VALUES.blocks.hero.title ?? {
        en: "Hero Title",
        es: "Título Hero",
      }
    ),
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
      en: [defaultHeroLinkItem("Learn more")],
      es: [defaultHeroLinkItem("Saber más")],
    }),
    fields: (link() as GroupField).fields,
    label: { en: "Actions", es: "Acciones" },
    localized: true,
    maxRows: 2,
    name: "actions",
    type: "array",
  },
  imageField("image", { withDefaultMedia: true }),
  {
    fields: [
      {
        name: "enabled",
        type: "checkbox",
        defaultValue: true,
        label: { en: "Enabled", es: "Habilitado" },
      },
      {
        name: "color",
        type: "select",
        defaultValue: "black",
        options: [
          { label: { en: "Black", es: "Negro" }, value: "black" },
          { label: { en: "White", es: "Blanco" }, value: "white" },
        ],
        label: { en: "Color", es: "Color" },
      },
      {
        name: "opacity",
        type: "number",
        defaultValue: 40,
        min: 0,
        max: 100,
        admin: {
          description: {
            en: "Overlay opacity (0-100)",
            es: "Opacidad del overlay (0-100)",
          },
        },
        label: { en: "Opacity", es: "Opacidad" },
      },
    ],
    label: { en: "Overlay", es: "Overlay" },
    type: "group",
  },
];
