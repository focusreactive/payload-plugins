import type { Field, GroupField } from "payload";

import { link } from "@/lib/fields/link";

export const ctaBannerFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "50%" },
        label: "Eyebrow",
        localized: true,
        name: "eyebrow",
        type: "text",
      },
      {
        admin: {
          description: "Visual emphasis of the banner.",
          width: "50%",
        },
        defaultValue: "default",
        label: "Variant",
        name: "variant",
        options: [
          { label: "Default", value: "default" },
          { label: "Accent (lime)", value: "accent" },
          { label: "Dark", value: "dark" },
        ],
        type: "select",
      },
    ],
  },
  {
    label: "Heading",
    localized: true,
    name: "heading",
    type: "text",
  },
  {
    label: "Description",
    localized: true,
    name: "description",
    type: "textarea",
  },
  {
    admin: { initCollapsed: true },
    fields: (link() as GroupField).fields,
    label: "Actions",
    localized: true,
    minRows: 1,
    name: "actions",
    type: "array",
  },
];
