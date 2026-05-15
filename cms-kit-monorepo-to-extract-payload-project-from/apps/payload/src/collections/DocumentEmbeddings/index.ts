import type { CollectionConfig } from "payload";

import { superAdmin } from "@/core/lib/access";

export const DocumentEmbeddings: CollectionConfig = {
  access: {
    create: superAdmin,
    delete: superAdmin,
    read: superAdmin,
    update: superAdmin,
  },
  admin: {
    group: "System",
  },
  fields: [
    {
      name: "documentId",
      type: "text",
      required: true,
    },
    {
      name: "collection",
      type: "select",
      required: true,
      options: [
        { label: "Page", value: "page" },
        { label: "Post", value: "post" },
      ],
    },
    {
      name: "locale",
      type: "text",
      required: true,
    },
  ],
  labels: {
    plural: {
      en: "Document Embeddings",
      es: "Incrustaciones de Documentos",
    },
    singular: {
      en: "Document Embedding",
      es: "Incrustación de Documento",
    },
  },
  slug: "document-embeddings",
};
