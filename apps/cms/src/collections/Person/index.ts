import { editorialInOwnMarkets, rejectMarketsOutsideEditorScope } from "@/lib/access/marketScoped";
import type { CollectionConfig } from "payload";

import { anyone, editorial } from "@/lib/access";
import { marketsField } from "@/lib/fields/marketsField";
import { seoMetaGroup } from "@/lib/fields/seoMetaGroup";

export const Person: CollectionConfig<"person"> = {
  access: {
    create: editorial,
    delete: editorialInOwnMarkets,
    read: anyone,
    update: editorialInOwnMarkets,
  },
  admin: {
    defaultColumns: ["photo", "name", "jobTitle", "office", "email", "updatedAt"],
    group: "Content",
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
        en: "Photo",
        es: "Foto",
      },
      name: "photo",
      relationTo: "media",
      type: "upload",
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
    seoMetaGroup({ descriptionFallback: "job title and office", titleFallback: "name" }),
  ],
  hooks: {
    beforeChange: [rejectMarketsOutsideEditorScope],
  },
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
