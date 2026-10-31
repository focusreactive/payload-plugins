import type { GroupField } from "payload";

import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import type { Locale } from "@/lib/types";

type LocalizedDefault = Record<Locale, string>;

interface SectionHeadingDefaults {
  eyebrow?: LocalizedDefault;
  title?: LocalizedDefault;
  description?: LocalizedDefault;
}

function withLocalizedDefault(value: LocalizedDefault | undefined) {
  return value ? { defaultValue: createLocalizedDefault(value) } : {};
}

export function sectionHeadingField(defaults: SectionHeadingDefaults = {}): GroupField {
  return {
    fields: [
      {
        type: "row",
        fields: [
          {
            ...withLocalizedDefault(defaults.eyebrow),
            admin: { width: "40%" },
            label: { en: "Eyebrow", es: "Antetítulo" },
            localized: true,
            name: "eyebrow",
            type: "text",
          },
          {
            ...withLocalizedDefault(defaults.title),
            admin: {
              width: "60%",
              description: {
                en: "Wrap a word in *asterisks* to accent it in the brand colour.",
                es: "Envuelve una palabra en *asteriscos* para resaltarla con el color de marca.",
              },
            },
            label: { en: "Title", es: "Título" },
            localized: true,
            name: "title",
            type: "text",
          },
        ],
      },
      {
        ...withLocalizedDefault(defaults.description),
        label: { en: "Description", es: "Descripción" },
        localized: true,
        name: "description",
        type: "textarea",
      },
    ],
    interfaceName: "SectionHeadingFields",
    label: { en: "Heading", es: "Encabezado" },
    name: "heading",
    type: "group",
  };
}
