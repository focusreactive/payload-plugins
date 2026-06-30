import type { CollectionConfig } from "payload";

import { contentBlocks } from "@/blocks/contentBlocks";
import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";

import { preventDeleteIfReferenced } from "./hooks/preventDeleteIfReferenced";

export const GlobalSection: CollectionConfig<"globalSection"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: or(superAdmin, user, author),
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["title", "updatedAt"],
    group: "Content",
    useAsTitle: "title",
  },
  dbName: "gsec",
  fields: [
    {
      admin: {
        description: {
          en: "Internal name to identify this global section in the picker.",
          es: "Nombre interno para identificar esta sección global en el selector.",
        },
      },
      defaultValue: createLocalizedDefault({ en: "Global Section", es: "Sección Global" }),
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    {
      admin: {
        description: {
          en: "The single section this global represents. Edit once, reuse on any page.",
          es: "La única sección que representa este global. Edítala una vez y reutilízala en cualquier página.",
        },
        initCollapsed: true,
      },
      blocks: contentBlocks,
      localized: true,
      maxRows: 1,
      minRows: 1,
      name: "block",
      required: true,
      type: "blocks",
    },
  ],
  hooks: {
    beforeDelete: [preventDeleteIfReferenced],
  },
  labels: {
    plural: { en: "Global Sections", es: "Secciones Globales" },
    singular: { en: "Global Section", es: "Sección Global" },
  },
  slug: "globalSection",
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
