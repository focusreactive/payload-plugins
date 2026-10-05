import type { Field } from "payload";

import { imageField } from "@/lib/fields/imageField";
import { link } from "@/lib/fields/link";

import { CARD_ICONS } from "./icons";

export const cardsGridFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "50%" },
        defaultValue: 3,
        label: "Columns",
        max: 4,
        min: 1,
        name: "columns",
        type: "number",
      },
      {
        admin: {
          width: "50%",
          description: "Show 01, 02 … above each card title",
        },
        defaultValue: false,
        label: "Numbered",
        name: "numbered",
        type: "checkbox",
      },
    ],
  },
  {
    admin: { initCollapsed: true },
    fields: [
      {
        type: "row",
        fields: [
          {
            admin: {
              width: "40%",
              description: "Optional icon shown in a tinted tile",
            },
            label: "Icon",
            name: "icon",
            options: CARD_ICONS.map((icon) => ({ label: icon, value: icon })),
            type: "select",
          },
          {
            admin: { width: "60%" },
            label: "Title",
            localized: true,
            name: "title",
            required: true,
            type: "text",
          },
        ],
      },
      {
        label: "Description",
        localized: true,
        name: "description",
        type: "text",
      },
      imageField("image", { required: false }),
      link({ required: false }),
      {
        type: "row",
        fields: [
          {
            admin: { width: "33%" },
            defaultValue: "center",
            label: "Alignment",
            name: "alignVariant",
            options: [
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ],
            type: "select",
          },
          {
            admin: { width: "33%" },
            defaultValue: "none",
            label: "Rounded",
            name: "rounded",
            options: [
              { label: "None", value: "none" },
              { label: "Large", value: "large" },
            ],
            type: "select",
          },
          {
            admin: { width: "34%" },
            defaultValue: "none",
            label: "Background Color",
            name: "backgroundColor",
            options: [
              { label: "None", value: "none" },
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
              {
                label: "Light Gray",
                value: "light-gray",
              },
              { label: "Dark Gray", value: "dark-gray" },
              {
                label: "Gradient 2",
                value: "gradient-2",
              },
            ],
            type: "select",
          },
        ],
      },
    ],
    label: "Cards",
    localized: true,
    minRows: 1,
    name: "items",
    required: true,
    type: "array",
  },
];
