import type { CollectionConfig } from "payload";

import { contentBlocks } from "@/blocks/contentBlocks";
import { anyone, editorial } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";

import { preventDeleteIfReferenced } from "./hooks/preventDeleteIfReferenced";

export const GlobalBlock: CollectionConfig<"globalBlock"> = {
  access: {
    create: editorial,
    delete: editorial,
    read: anyone,
    update: editorial,
  },
  admin: {
    defaultColumns: ["title", "block", "updatedAt"],
    group: "Reusable blocks",
    useAsTitle: "title",
  },
  dbName: "gsec",
  fields: [
    {
      admin: {
        description: {
          en: "Internal name to identify this global block in the picker.",
          es: "Nombre interno para identificar este bloque global en el selector.",
        },
      },
      defaultValue: createLocalizedDefault({ en: "Global Block", es: "Bloque Global" }),
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    {
      admin: {
        components: {
          Cell: "/components/admin/BlockNameCell#BlockNameCell",
        },
        description: {
          en: "The single block this global represents. Edit once, reuse on any page.",
          es: "El único bloque que representa este global. Edítalo una vez y reutilízalo en cualquier página.",
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
    plural: { en: "Global Blocks", es: "Bloques Globales" },
    singular: { en: "Global Block", es: "Bloque Global" },
  },
  slug: "globalBlock",
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
