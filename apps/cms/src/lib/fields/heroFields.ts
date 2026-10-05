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
  url: "https://www.google.com",
});

export const heroFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "50%" },
        defaultValue: "showcase",
        label: "Variant",
        name: "variant",
        options: [
          { label: "Showcase window", value: "showcase" },
          { label: "Centered", value: "centered" },
        ],
        required: true,
        type: "select",
      },
      {
        admin: { width: "50%" },
        label: "Eyebrow",
        localized: true,
        name: "eyebrow",
        type: "text",
      },
    ],
  },
  {
    defaultValue: createLocalizedDefault(DEFAULT_VALUES.blocks.hero.title),
    label: "Title",
    localized: true,
    name: "title",
    type: "text",
  },
  {
    defaultValue: createLocalizedRichText(DEFAULT_VALUES.richText.text),
    editor: generateRichText("hero"),
    label: "Rich Text",
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
        { ...defaultHeroLinkItem("Start free"), appearance: "accent" as const },
        { ...defaultHeroLinkItem("Watch the tour"), appearance: "outline" as const },
      ],
    }),
    fields: (link() as GroupField).fields,
    label: "Actions",
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
