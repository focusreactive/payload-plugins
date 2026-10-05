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

// Defaults exist for en; other locales fall back to them via createLocalizedDefault.
function buildFaqItems(locale: Extract<Locale, "en">) {
  const { question, answer } = DEFAULT_VALUES.blocks.faq;
  return Array.from({ length: 3 }, () => ({
    answer: createRichTextState(answer[locale].heading, answer[locale].paragraph),
    question: question[locale],
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
        label: "Question",
        localized: true,
        name: "question",
        required: true,
        type: "text",
      },
      {
        defaultValue: createLocalizedRichText(DEFAULT_VALUES.blocks.faq.answer),
        editor: generateRichText(),
        label: "Answer",
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
    plural: "FAQ Sections",
    singular: "FAQ Section",
  },
  fields,
});
