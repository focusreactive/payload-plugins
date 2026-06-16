import type { Field } from "payload";

import { createLocalizedDefault } from "@/core/lib/createLocalizedDefault";
import type { Locale } from "@/core/types";

type LocalizedDefault = Record<Locale, string>;

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
          ...(options.eyebrowDefault ? { defaultValue: createLocalizedDefault(options.eyebrowDefault) } : {}),
          admin: { width: "40%" },
          label: { en: "Eyebrow", es: "Antetítulo" },
          localized: true,
          name: "eyebrow",
          type: "text",
        },
        {
          ...(options.headingDefault ? { defaultValue: createLocalizedDefault(options.headingDefault) } : {}),
          admin: {
            width: "60%",
            description: {
              en: "Wrap a word in *asterisks* to accent it in the brand colour.",
              es: "Envuelve una palabra en *asteriscos* para resaltarla con el color de marca.",
            },
          },
          label: { en: "Heading", es: "Encabezado" },
          localized: true,
          name: "heading",
          type: "text",
        },
      ],
    },
    {
      ...(options.descriptionDefault ? { defaultValue: createLocalizedDefault(options.descriptionDefault) } : {}),
      label: { en: "Description", es: "Descripción" },
      localized: true,
      name: "description",
      type: "textarea",
    },
  ];
}
