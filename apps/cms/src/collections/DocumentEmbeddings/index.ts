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
      name: "collection",
      // Payload generates the Postgres enum from this list, so a value added here needs a
      // migration that runs ALTER TYPE ... ADD VALUE before any row can carry it - otherwise the
      // upsert fails at the database, below where TypeScript can see it.
      options: [
        { label: "Page", value: "page" },
        { label: "Post", value: "post" },
        { label: "Talk", value: "talk" },
        { label: "Topic", value: "topic" },
      ],
      required: true,
      type: "select",
    },
    {
      name: "locale",
      required: true,
      type: "text",
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
