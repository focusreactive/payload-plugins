import type { CollectionConfig, CollectionSlug } from "payload";
import { setAuthorBeforeCreate } from "./hooks/setAuthorBeforeCreate";
import { setTenantBeforeCreate } from "./hooks/setTenantBeforeCreate";
import { DEFAULT_COLLECTION_SLUG } from "../constants";
import type { TenantPluginConfig } from "../types";
import { isAuth } from "./access/isAuth";

export const baseCollection = (tenantConfig?: TenantPluginConfig): CollectionConfig => ({
  slug: DEFAULT_COLLECTION_SLUG,
  labels: {
    singular: { en: "Comment", es: "Comentario" },
    plural: { en: "Comments", es: "Comentarios" },
  },
  admin: {
    hidden: true,
    useAsTitle: "text",
    defaultColumns: ["author", "collectionSlug", "status", "createdAt"],
  },
  access: {
    create: isAuth,
    read: isAuth,
    update: isAuth,
    delete: isAuth,
  },
  hooks: {
    beforeChange: [setAuthorBeforeCreate, ...(tenantConfig?.enabled ? [setTenantBeforeCreate] : [])],
  },
  timestamps: true,
  fields: [
    {
      name: "documentId",
      type: "number",
      index: true,
    },
    {
      name: "collectionSlug",
      type: "text",
      index: true,
    },
    {
      name: "globalSlug",
      type: "text",
      index: true,
      admin: {
        description: "Slug of the Payload global being commented on. Null = collection document comment.",
      },
    },
    {
      name: "fieldPath",
      type: "text",
      index: true,
      admin: {
        description: "Dot-notation path of the field being commented on. Null = document-level.",
      },
    },
    {
      name: "locale",
      type: "text",
      required: false,
      index: true,
      admin: {
        description: "Locale for field-level comments. Null = document-level (shown in all locales).",
      },
    },
    {
      name: "text",
      type: "textarea",
      required: true,
      label: "Comment",
    },
    {
      name: "mentions",
      type: "array",
      label: "Mentions",
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: "user",
          type: "relationship",
          relationTo: "users",
          required: true,
        },
      ],
    },
    {
      name: "author",
      type: "relationship",
      relationTo: "users",
      required: true,
      label: "Author",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "isResolved",
      type: "checkbox",
      defaultValue: false,
      label: "Resolved",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "resolvedBy",
      type: "relationship",
      relationTo: "users",
      label: "Resolved by",
      admin: {
        position: "sidebar",
        condition: (_data, siblingData) => siblingData?.status === "resolved",
      },
    },
    {
      name: "resolvedAt",
      type: "date",
      label: "Resolved at",
      admin: {
        position: "sidebar",
        condition: (_data, siblingData) => siblingData?.status === "resolved",
      },
    },
    ...(tenantConfig?.enabled ?
      [
        {
          name: "tenant",
          type: "relationship" as const,
          relationTo: (tenantConfig.collectionSlug ?? "tenants") as CollectionSlug,
          index: true,
          label: "Tenant",
          admin: {
            position: "sidebar" as const,
          },
        },
      ]
    : []),
  ],
});
