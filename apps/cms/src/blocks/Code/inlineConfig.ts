import type { Block } from "payload";

export const CodeInlineBlock: Block = {
  fields: [
    {
      name: "language",
      type: "text",
      admin: {
        description: "Language hint (e.g. typescript, bash). Used for the syntax class.",
      },
      label: "Language",
    },
    {
      name: "code",
      type: "code",
      label: "Code",
      required: true,
    },
  ],
  interfaceName: "CodeInlineBlock",
  labels: {
    plural: "Code Blocks",
    singular: "Code",
  },
  slug: "codeInline",
};
