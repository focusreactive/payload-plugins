import type { Block } from "payload";

export const CodeInlineBlock: Block = {
  fields: [
    {
      name: "language",
      type: "text",
      admin: {
        description: {
          en: "Lowercase language id, e.g. typescript, bash.",
          es: "Id del lenguaje en minúsculas, p. ej. typescript, bash.",
        },
      },
      label: { en: "Language", es: "Lenguaje" },
    },
    {
      name: "code",
      type: "code",
      label: { en: "Code", es: "Código" },
      required: true,
    },
  ],
  interfaceName: "CodeInlineBlock",
  labels: {
    plural: { en: "Code Blocks", es: "Bloques de código" },
    singular: { en: "Code", es: "Código" },
  },
  slug: "codeInline",
};
