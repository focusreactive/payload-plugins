import { revalidateTag } from "next/cache";
import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";

import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { generateRichText } from "@/lib/utils/generateRichText";
import { DEFAULT_MEDIA_CACHE_TAG } from "@/dal/getDefaultMediaId";

const setDefaultFocalPoint: CollectionBeforeChangeHook = ({ data }) => {
  if (data) {
    if (data.focalX === undefined || data.focalX === null) {
      data.focalX = 50;
    }
    if (data.focalY === undefined || data.focalY === null) {
      data.focalY = 50;
    }
  }
  return data;
};

export const Media: CollectionConfig<"media"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: or(superAdmin, user, author),
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["filename", "alt"],
    group: "Content",
    pagination: {
      limits: [20, 50, 100],
    },
  },
  fields: [
    {
      label: {
        en: "Alt",
        es: "Alt",
      },
      localized: true,
      name: "alt",
      required: true,
      type: "text",
    },
    {
      editor: generateRichText(),
      label: {
        en: "Caption",
        es: "Descripción",
      },
      localized: true,
      name: "caption",
      type: "richText",
    },
    {
      admin: {
        description: {
          en: "Use this file as default when no image is selected.",
          es: "Usar este archivo por defecto cuando no se seleccione ninguna imagen.",
        },
      },
      hasMany: true,
      name: "defaultFor",
      options: [
        {
          label: {
            en: "Default image for the platform (logo, blocks, sections)",
            es: "Imagen por defecto de la plataforma (logo, bloques, secciones)",
          },
          value: "platform_default",
        },
      ],
      type: "select",
    },
  ],
  folders: true,
  hooks: {
    beforeChange: [setDefaultFocalPoint],
    afterChange: [
      ({ req }) => {
        if (req?.context?.disableRevalidate) return;
        try {
          revalidateTag(DEFAULT_MEDIA_CACHE_TAG, "max");
        } catch {
          // outside a Next.js request/build context (e.g. seed scripts, tests)
        }
      },
    ],
    afterDelete: [
      ({ req }) => {
        if (req?.context?.disableRevalidate) return;
        try {
          revalidateTag(DEFAULT_MEDIA_CACHE_TAG, "max");
        } catch {
          // outside a Next.js request/build context (e.g. seed scripts, tests)
        }
      },
    ],
  },
  labels: {
    plural: {
      en: "Media",
      es: "Medios",
    },
    singular: {
      en: "Media",
      es: "Medio",
    },
  },
  slug: "media",
  upload: {
    adminThumbnail: "thumbnail",
    disableLocalStorage: process.env.NODE_ENV === "production",
    focalPoint: true,
    imageSizes: [
      {
        name: "thumbnail",
        width: 300,
      },
      {
        height: 500,
        name: "square",
        width: 500,
      },
      {
        name: "small",
        width: 600,
      },
      {
        name: "medium",
        width: 900,
      },
      {
        name: "large",
        width: 1400,
      },
      {
        name: "xlarge",
        width: 1920,
      },
      {
        crop: "center",
        height: 630,
        name: "og",
        width: 1200,
      },
    ],
    staticDir: process.env.NODE_ENV === "production" ? undefined : "public/media",
  },
};
