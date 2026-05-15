import type { Block, Field } from "payload";

import { DEFAULT_VALUES } from "@/core/constants/defaultValues";
import { getBlockPreviewImage } from "@/core/lib/blockPreviewImage";
import {
  createLocalizedDefault,
  createLocalizedRichText,
  createRichTextState,
} from "@/core/lib/createLocalizedDefault";
import { generateRichText } from "@/core/lib/generateRichText";
import type { Locale } from "@/core/types";
import { embedSectionTab } from "@/fields/section/embedSectionTab";

function buildFaqItems(locale: Locale) {
  const { question, answer } = DEFAULT_VALUES.blocks.faq;
  return Array.from({ length: 3 }, () => ({
    answer: createRichTextState(
      answer[locale].heading,
      answer[locale].paragraph
    ),
    question: question[locale],
  }));
}

const fields: Field[] = [
  {
    defaultValue: createLocalizedDefault(DEFAULT_VALUES.blocks.faq.heading),
    label: { en: "Heading", es: "Encabezado" },
    localized: true,
    name: "heading",
    required: true,
    type: "text",
  },
  {
    defaultValue: createLocalizedDefault({
      en: buildFaqItems("en"),
      es: buildFaqItems("es"),
    }),
    fields: [
      {
        name: "question",
        type: "text",
        required: true,
        label: { en: "Question", es: "Pregunta" },
        localized: true,
      },
      {
        name: "answer",
        type: "richText",
        editor: generateRichText(),
        required: true,
        label: { en: "Answer", es: "Respuesta" },
        localized: true,
        defaultValue: createLocalizedRichText(DEFAULT_VALUES.blocks.faq.answer),
      },
    ],
    localized: true,
    minRows: 1,
    name: "items",
    required: true,
    type: "array",
  },
];

export const FaqBlock: Block = {
  slug: "faq",
  interfaceName: "FaqBlock",
  ...getBlockPreviewImage("FAQ Section"),
  labels: {
    plural: { en: "FAQ Sections", es: "Secciones de FAQ" },
    singular: { en: "FAQ Section", es: "Sección de FAQ" },
  },
  fields: embedSectionTab(fields),
};
