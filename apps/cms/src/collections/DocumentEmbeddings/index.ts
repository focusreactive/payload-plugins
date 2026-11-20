import type { CollectionConfig } from "payload";

import { superAdmin } from "@/lib/access";

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
      required: true,
      type: "text",
    },
    {
      fields: [
        {
          admin: { width: "50%" },
          name: "collection",
          options: [
            { label: "Page", value: "page" },
            { label: "Post", value: "post" },
          ],
          required: true,
          type: "select",
        },
        {
          admin: { width: "50%" },
          name: "locale",
          required: true,
          type: "text",
        },
      ],
      type: "row",
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
