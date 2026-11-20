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
      label: { en: "Programming language", es: "Lenguaje de programación" },
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
    plural: { en: "Code snippets", es: "Fragmentos de código" },
    singular: { en: "Code snippet", es: "Fragmento de código" },
  },
  slug: "codeInline",
};
