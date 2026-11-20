import type { Block } from "payload";

import { CODE_LANGUAGES, DEFAULT_CODE_LANGUAGE } from "./languages";

export const CodeInlineBlock: Block = {
  fields: [
    {
      name: "language",
      type: "select",
      defaultValue: DEFAULT_CODE_LANGUAGE,
      label: { en: "Programming language", es: "Lenguaje de programación" },
      options: CODE_LANGUAGES.map(({ label, value }) => ({ label, value })),
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
