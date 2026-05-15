import type { Block, Field } from "payload";

const copyFields: Field[] = [
  {
    localized: true,
    name: "text",
    required: true,
    type: "textarea",
  },
];

export const CopyBlock: Block = {
  fields: copyFields,
  labels: { plural: "Copy Sections", singular: "Copy" },
  slug: "copy",
};
