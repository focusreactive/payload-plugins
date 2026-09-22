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

function buildFaqItems(locale: string) {
  const { question, answer } = DEFAULT_VALUES.blocks.faq;
  const answerCopy = answer[locale as keyof typeof answer] ?? answer.en;
  const questionCopy = question[locale as keyof typeof question] ?? question.en;
  return Array.from({ length: 3 }, () => ({
    answer: createRichTextState(answerCopy.heading, answerCopy.paragraph),
    question: questionCopy,
  }));
}

const fields: Field[] = [
  ...sectionHeaderFields({ headingDefault: DEFAULT_VALUES.blocks.faq.heading }),
  {
    admin: { initCollapsed: true },
    defaultValue: createLocalizedDefault({
      en: buildFaqItems("en"),
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
