import type { CollectionConfig } from "payload";

import { or, user, author, superAdmin } from "@/core/lib/access";

export const Authors: CollectionConfig<"authors"> = {
  access: {
    create: or(superAdmin, user, author, user),
    delete: or(superAdmin, user, author, user),
    read: or(superAdmin, user, author, user),
    update: or(superAdmin, user, author, user),
  },
  admin: {
    defaultColumns: ["name", "updatedAt"],
    group: "Blog",
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
