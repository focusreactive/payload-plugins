import { revalidateTag } from "next/cache";
import type { CollectionConfig } from "payload";

import { anyone, author, or, superAdmin, user } from "@/core/lib/access";
import { generateRichText } from "@/core/lib/generateRichText";
import { DEFAULT_MEDIA_CACHE_TAG } from "@/dal/getDefaultMediaId";

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
      name: "alt",
      type: "text",
      required: true,
      label: {
        en: "Alt",
        es: "Alt",
      },
      localized: true,
    },
    {
      name: "caption",
      type: "richText",
      editor: generateRichText(),
      label: {
        en: "Caption",
        es: "Descripción",
      },
      localized: true,
    },
    {
      name: "defaultFor",
      type: "select",
      hasMany: true,
      options: [
        {
          value: "platform_default",
          label: {
            en: "Default image for the platform (logo, blocks, sections)",
            es: "Imagen por defecto de la plataforma (logo, bloques, secciones)",
          },
        },
      ],
      admin: {
        description: {
          en: "Use this file as default when no image is selected.",
          es: "Usar este archivo por defecto cuando no se seleccione ninguna imagen.",
        },
      },
    },
  ],
  folders: true,
  hooks: {
    afterChange: [
      () => {
        revalidateTag(DEFAULT_MEDIA_CACHE_TAG, "max");
      },
    ],
    afterDelete: [
      () => {
        revalidateTag(DEFAULT_MEDIA_CACHE_TAG, "max");
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
        name: "square",
        width: 500,
        height: 500,
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
        name: "og",
        width: 1200,
        height: 630,
        crop: "center",
      },
    ],
    staticDir:
      process.env.NODE_ENV === "production" ? undefined : "public/media",
  },
};
