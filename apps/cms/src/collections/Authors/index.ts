import type { CollectionConfig } from "payload";

import { author, editor, or, superAdmin, user } from "@/lib/access";

export const Authors: CollectionConfig<"authors"> = {
  access: {
    create: or(superAdmin, user, author, editor),
    delete: or(superAdmin, user, author, editor),
    read: or(superAdmin, user, author, editor),
    update: or(superAdmin, user, author, editor),
  },
  admin: {
    defaultColumns: ["name", "avatar", "updatedAt"],
    group: "Blog",
    pagination: {
      limits: [20, 50, 100],
    },
    useAsTitle: "name",
  },
  fields: [
    {
      fields: [
        {
          admin: { width: "50%" },
          label: {
            en: "Name",
            es: "Nombre",
          },
          name: "name",
          required: true,
          type: "text",
        },
        {
          admin: { width: "50%" },
          label: { en: "Avatar", es: "Avatar" },
          name: "avatar",
          relationTo: "media",
          type: "upload",
        },
      ],
      type: "row",
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
