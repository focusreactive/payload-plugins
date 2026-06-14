import type { Block } from "payload";

export const CodeInlineBlock: Block = {
  fields: [
    {
      name: "language",
      type: "text",
      admin: {
        description: {
          en: "Language hint (e.g. typescript, bash). Used for the syntax class.",
          es: "Pista de lenguaje (p. ej. typescript, bash). Se usa para la clase de sintaxis.",
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
