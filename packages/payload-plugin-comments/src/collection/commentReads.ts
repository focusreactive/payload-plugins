import type { CollectionConfig, CollectionSlug } from "payload";
import { COMMENT_READS_COLLECTION_SLUG, DEFAULT_COLLECTION_SLUG } from "../constants";
import type { TenantPluginConfig } from "../types";
import { isAuth } from "./access/isAuth";
import { setUserBeforeCreate } from "./hooks/setUserBeforeCreate";
import { setTenantOnReadBeforeCreate } from "./hooks/setTenantOnReadBeforeCreate";

export const baseReadsCollection = (tenantConfig?: TenantPluginConfig): CollectionConfig => ({
  slug: COMMENT_READS_COLLECTION_SLUG,
  labels: {
    singular: { en: "Comment read", es: "Lectura de comentario" },
    plural: { en: "Comment reads", es: "Lecturas de comentarios" },
  },
  admin: {
    hidden: true,
    useAsTitle: "id",
    defaultColumns: ["comment", "user", "readAt"],
  },
  access: {
    create: isAuth,
    read: isAuth,
    update: isAuth,
    delete: isAuth,
  },
  hooks: {
    beforeChange: [setUserBeforeCreate, ...(tenantConfig?.enabled ? [setTenantOnReadBeforeCreate] : [])],
  },
  timestamps: true,
  fields: [
    {
      name: "comment",
      type: "relationship",
      relationTo: DEFAULT_COLLECTION_SLUG,
      required: true,
      index: true,
    },
    {
      name: "user",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
    },
    {
      name: "readAt",
      type: "date",
      required: true,
      defaultValue: () => new Date().toISOString(),
    },
    ...(tenantConfig?.enabled
      ? [
          {
            name: "tenant",
            type: "relationship" as const,
            relationTo: tenantConfig.collectionSlug ?? "tenants",
            index: true,
            label: "Tenant",
            admin: { position: "sidebar" as const },
          },
        ]
      : []),
  ],
});
