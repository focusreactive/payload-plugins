import type { Field, GroupField } from "payload";
import type { Option } from "payload";

import { BLOG_CONFIG } from "@/lib/config/blog";
import { CUSTOM_PAGES_CONFIG } from "@/lib/config/customPages";
import type { CustomPageKey } from "@/lib/config/customPages";
import deepMerge from "@/lib/utils/deepMerge";

export type LinkAppearances = "default" | "outline" | "accent" | "ghost" | "link";

export const appearanceOptions: Record<LinkAppearances, Option> = {
  default: {
    label: {
      en: "Primary (solid)",
      es: "Primario (sólido)",
    },
    value: "default",
  },
  outline: {
    label: {
      en: "Secondary (outline)",
      es: "Secundario (contorno)",
    },
    value: "outline",
  },
  accent: {
    label: {
      en: "Accent (lime)",
      es: "Acento (lima)",
    },
    value: "accent",
  },
  ghost: {
    label: {
      en: "Ghost",
      es: "Fantasma",
    },
    value: "ghost",
  },
  link: {
    label: {
      en: "Text link",
      es: "Enlace de texto",
    },
    value: "link",
  },
};

type LinkType = (options?: {
  appearances?: LinkAppearances[] | false;
  customPageDbName?: string;
  disableLabel?: boolean;
  required?: boolean;
  overrides?: Partial<GroupField>;
}) => Field;

export const link: LinkType = ({
  appearances,
  customPageDbName,
  disableLabel = false,
  required = true,
  overrides = {},
} = {}) => {
  const linkResult: GroupField = {
    admin: {
      hideGutter: true,
    },
    fields: [
      {
        fields: [
          {
            admin: {
              layout: "horizontal",
              width: "50%",
            },
            defaultValue: "reference",
            name: "type",
            options: [
              {
                label: {
                  en: "Internal link",
                  es: "Enlace interno",
                },
                value: "reference",
              },
              {
                label: {
                  en: "Custom URL",
                  es: "URL personalizada",
                },
                value: "custom",
              },
              {
                label: {
                  en: "Custom Page",
                  es: "Página personalizada",
                },
                value: "customPage",
              },
            ],
            type: "radio",
          },
          {
            admin: {
              style: {
                alignSelf: "flex-end",
              },
              width: "50%",
            },
            label: {
              en: "Open in new tab",
              es: "Abrir en una nueva pestaña",
            },
            name: "newTab",
            type: "checkbox",
          },
        ],
        type: "row",
      },
    ],
    name: "link",
    type: "group",
  };

  const linkTypes: Field[] = [
    {
      admin: {
        condition: (_, siblingData) => siblingData?.type === "reference",
      },
      label: {
        en: "Document to link to",
        es: "Documento al que enlazar",
      },
      name: "reference",
      relationTo: ["page", BLOG_CONFIG.collection],
      required,
      type: "relationship",
    },
    {
      admin: {
        condition: (_, siblingData) => siblingData?.type === "custom",
      },
      label: {
        en: "Custom URL",
        es: "URL personalizada",
      },
      name: "url",
      required,
      type: "text",
    },
    {
      admin: {
        condition: (_, siblingData) => siblingData?.type === "customPage",
      },
      ...(customPageDbName ? { dbName: customPageDbName } : {}),
      label: {
        en: "Custom Page",
        es: "Página personalizada",
      },
      name: "customPage",
      options: Object.entries(CUSTOM_PAGES_CONFIG).map(([key, entry]) => ({
        label: entry.label,
        value: key as CustomPageKey,
      })),
      required,
      type: "select",
    },
  ];

  if (!disableLabel) {
    linkTypes.map((linkType) => ({
      ...linkType,
      admin: {
        ...linkType.admin,
        width: "50%",
      },
    }));

    linkResult.fields.push({
      fields: [
        ...linkTypes,
        {
          admin: {
            width: "50%",
          },
          label: {
            en: "Label",
            es: "Etiqueta",
          },
          localized: true,
          name: "label",
          required,
          type: "text",
        },
      ],
      type: "row",
    });
  } else {
    linkResult.fields = [...linkResult.fields, ...linkTypes];
  }

  if (appearances !== false) {
    let appearanceOptionsToUse = [
      appearanceOptions.default,
      appearanceOptions.outline,
      appearanceOptions.accent,
      appearanceOptions.ghost,
      appearanceOptions.link,
    ];

    if (appearances) {
      appearanceOptionsToUse = appearances.map((appearance) => appearanceOptions[appearance]);
    }

    linkResult.fields.push({
      admin: {
        description: {
          en: "Choose how the link should be rendered.",
          es: "Elige cómo se debe renderizar el enlace.",
        },
      },
      defaultValue: "default",
      name: "appearance",
      options: appearanceOptionsToUse,
      type: "select",
    });
  }

  return deepMerge(linkResult, overrides);
};
