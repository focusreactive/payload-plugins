import type { CollectionConfig } from "payload";

import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { marketsField } from "@/lib/fields/marketsField";

export const Person: CollectionConfig<"person"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: or(superAdmin, user, author),
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["name", "jobTitle", "office", "email", "updatedAt"],
    group: "Insights",
    pagination: {
      limits: [20, 50, 100],
    },
    useAsTitle: "name",
  },
  fields: [
    {
      label: {
        en: "Name",
        es: "Nombre",
      },
      name: "name",
      required: true,
      type: "text",
    },
    {
      label: {
        en: "Job Title",
        es: "Cargo",
      },
      name: "jobTitle",
      required: true,
      type: "text",
    },
    {
      admin: {
        description: {
          en: "Used to match this person to an article's author automatically.",
          es: "Se usa para relacionar automáticamente a esta persona con el autor de un artículo.",
        },
      },
      label: {
        en: "Email",
        es: "Correo electrónico",
      },
      name: "email",
      required: true,
      type: "email",
      unique: true,
    },
    {
      label: {
        en: "Office",
        es: "Oficina",
      },
      name: "office",
      type: "text",
    },
    {
      label: {
        en: "Biography",
        es: "Biografía",
      },
      name: "biography",
      type: "textarea",
    },
    marketsField(),
  ],
  labels: {
    plural: {
      en: "People",
      es: "Personas",
    },
    singular: {
      en: "Person",
      es: "Persona",
    },
  },
  slug: "person",
};
