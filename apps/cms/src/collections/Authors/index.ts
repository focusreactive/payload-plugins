import type { CollectionConfig } from "payload";

import { authenticated, editorial } from "@/lib/access";

export const Authors: CollectionConfig<"authors"> = {
  access: {
    create: editorial,
    delete: editorial,
    read: authenticated,
    update: editorial,
  },
  admin: {
    defaultColumns: ["name", "updatedAt"],
    group: "Blog",
    hidden: true,
    pagination: {
      limits: [20, 50, 100],
    },
    useAsTitle: "name",
  },
  fields: [
    {
      admin: {
        description: {
          en: "The name of the author",
          es: "El nombre del autor",
        },
      },
      label: {
        en: "Name",
        es: "Nombre",
      },
      name: "name",
      required: true,
      type: "text",
    },
    {
      label: { en: "Avatar", es: "Avatar" },
      name: "avatar",
      relationTo: "media",
      type: "upload",
    },
  ],
  labels: {
    plural: {
      en: "Authors",
      es: "Autores",
    },
    singular: {
      en: "Author",
      es: "Autor",
    },
  },
  slug: "authors",
};
