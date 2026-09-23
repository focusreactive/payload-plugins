import type { Field, GroupField } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import {
  createLocalizedDefault,
  createLocalizedRichText,
} from "@/lib/utils/createLocalizedDefault";
import { generateRichText } from "@/lib/utils/generateRichText";
import { imageField } from "@/lib/fields/imageField";
import { link } from "@/lib/fields/link";

const defaultHeroLinkItem = (label: string) => ({
  appearance: "default" as const,
  label,
  newTab: false,
  type: "custom" as const,
  url: "",
});

export const heroFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "50%" },
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
        admin: { width: "50%" },
        defaultValue: createLocalizedDefault({
          en: "New",
          es: "Nuevo",
        }),
        label: { en: "Eyebrow", es: "Antetítulo" },
        localized: true,
        name: "eyebrow",
        type: "text",
      },
    ],
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
        RowLabel: "@/components/admin/RowLabel#RowLabel",
      },
      initCollapsed: true,
    },
    defaultValue: createLocalizedDefault({
      en: [
        { ...defaultHeroLinkItem("Learn more"), appearance: "accent" as const },
        { ...defaultHeroLinkItem("Contact us"), appearance: "outline" as const },
      ],
      es: [
        { ...defaultHeroLinkItem("Más información"), appearance: "accent" as const },
        { ...defaultHeroLinkItem("Contáctenos"), appearance: "outline" as const },
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
