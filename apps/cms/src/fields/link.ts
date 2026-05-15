import type { Field, GroupField } from "payload";
import type { Option } from "payload";

import { BLOG_CONFIG } from "@/core/config/blog";
import { CUSTOM_PAGES_CONFIG } from '@/core/config/customPages';
import type { CustomPageKey } from '@/core/config/customPages';
import deepMerge from "@/core/lib/deepMerge";

export type LinkAppearances = "default" | "outline";

export const appearanceOptions: Record<LinkAppearances, Option> = {
  default: {
    label: {
      en: "Default",
      es: "Por defecto",
    },
    value: "default",
  },
  outline: {
    label: {
      en: "Outline",
      es: "Contorno",
    },
    value: "outline",
  },
};

type LinkType = (options?: {
  appearances?: LinkAppearances[] | false;
  disableLabel?: boolean;
  required?: boolean;
  overrides?: Partial<GroupField>;
}) => Field;

export const link: LinkType = ({
  appearances,
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
        type: "row",
        fields: [
          {
            name: "type",
            type: "radio",
            admin: {
              layout: "horizontal",
              width: "50%",
            },
            defaultValue: "reference",
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
          },
          {
            name: "newTab",
            type: "checkbox",
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
          },
        ],
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
      label: {
        en: "Custom Page",
        es: "Página personalizada",
      },
      name: "customPage",
      options: Object.entries(CUSTOM_PAGES_CONFIG).map(([key, entry]) => ({
        value: key as CustomPageKey,
        label: entry.label,
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
          name: "label",
          type: "text",
          admin: {
            width: "50%",
          },
          label: {
            en: "Label",
            es: "Etiqueta",
          },
          required,
          localized: true,
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
    ];

    if (appearances) {
      appearanceOptionsToUse = appearances.map(
        (appearance) => appearanceOptions[appearance]
      );
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
