import type { Block, Field } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import {
  createLocalizedDefault,
  createLocalizedRichText,
  createRichTextState,
} from "@/lib/utils/createLocalizedDefault";
import { generateRichText } from "@/lib/utils/generateRichText";
import type { Locale } from "@/lib/types";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";

function buildFaqItems(locale: Locale) {
  const { question, answer } = DEFAULT_VALUES.blocks.faq;
  return Array.from({ length: 3 }, () => ({
    answer: createRichTextState(answer[locale].heading, answer[locale].paragraph),
    question: question[locale],
  }));
}

const fields: Field[] = [
  ...sectionHeaderFields({ headingDefault: DEFAULT_VALUES.blocks.faq.heading }),
  {
    defaultValue: createLocalizedDefault({
      en: buildFaqItems("en"),
      es: buildFaqItems("es"),
    }),
    fields: [
      {
        label: { en: "Question", es: "Pregunta" },
        localized: true,
        name: "question",
        required: true,
        type: "text",
      },
      {
        defaultValue: createLocalizedRichText(DEFAULT_VALUES.blocks.faq.answer),
        editor: generateRichText(),
        label: { en: "Answer", es: "Respuesta" },
        localized: true,
        name: "answer",
        required: true,
        type: "richText",
      },
    ],
    localized: true,
    minRows: 1,
    name: "items",
    required: true,
    type: "array",
  },
];

export const FaqBlock: Block = injectSection({
  slug: "faq",
  interfaceName: "FaqBlock",
  ...getBlockPreviewImage("FAQ Section"),
  labels: {
    plural: { en: "FAQ Sections", es: "Secciones de FAQ" },
    singular: { en: "FAQ Section", es: "Sección de FAQ" },
  },
  fields,
});
