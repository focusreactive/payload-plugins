import type { Field } from "payload";

import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import type { Locale } from "@/lib/types";

type LocalizedDefault = Partial<Record<Locale, string>> & { en: string };

interface SectionHeaderFieldsOptions {
  eyebrowDefault?: LocalizedDefault;
  headingDefault?: LocalizedDefault;
  descriptionDefault?: LocalizedDefault;
}

export function sectionHeaderFields(options: SectionHeaderFieldsOptions = {}): Field[] {
  return [
    {
      type: "row",
      fields: [
        {
          ...(options.eyebrowDefault
            ? { defaultValue: createLocalizedDefault(options.eyebrowDefault) }
            : {}),
          admin: { width: "40%" },
          label: "Eyebrow",
          localized: true,
          name: "eyebrow",
          type: "text",
        },
        {
          ...(options.headingDefault
            ? { defaultValue: createLocalizedDefault(options.headingDefault) }
            : {}),
          admin: {
            width: "60%",
            description: "Wrap a word in *asterisks* to accent it in the brand colour.",
          },
          label: "Heading",
          localized: true,
          name: "heading",
          type: "text",
        },
      ],
    },
    {
      ...(options.descriptionDefault
        ? { defaultValue: createLocalizedDefault(options.descriptionDefault) }
        : {}),
      label: "Description",
      localized: true,
      name: "description",
      type: "textarea",
    },
  ];
}
