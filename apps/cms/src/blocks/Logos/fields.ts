import type { Field } from "payload";

import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { imageField } from "@/lib/fields/imageField";
import { link } from "@/lib/fields/link";

export const logosFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "60%" },
        defaultValue: createLocalizedDefault({
          en: "Clients and Partners",
        }),
        label: "Label",
        localized: true,
        name: "label",
        type: "text",
      },
      {
        admin: { width: "40%" },
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
    ],
  },
  {
    admin: { initCollapsed: true },
    // Image optional: without one the item renders as a text wordmark (its link label), §6.7.
    fields: [
      imageField("image", { required: false, withAspectRatio: false }),
      link({ appearances: false, required: false }),
    ],
    label: "Logo Items",
    localized: true,
    minRows: 1,
    name: "items",
    required: true,
    type: "array",
  },
];
