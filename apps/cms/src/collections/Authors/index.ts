import type { CollectionConfig } from "payload";

import { or, user, author, superAdmin } from "@/lib/access";

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
    {
      label: { en: "Avatar", es: "Avatar" },
      name: "avatar",
      relationTo: "media",
      type: "upload",
    },
    {
      admin: {
        description: {
          en: "The name printed after Written by on articles and cards, per language. Empty uses the name above.",
          es: "El nombre que aparece tras Escrito por en artículos y tarjetas, por idioma. Vacío usa el nombre de arriba.",
        },
      },
      label: { en: "Byline name", es: "Nombre en la firma" },
      localized: true,
      name: "bylineName",
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
