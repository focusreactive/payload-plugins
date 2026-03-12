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
      required: true,
      index: true,
    },
    {
      name: "collectionSlug",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "fieldPath",
      type: "text",
      index: true,
      admin: {
        description: {
          en: "Dot-notation path of the field being commented on. Null = document-level.",
          es: "Ruta en notación punto del campo comentado. Null = nivel de documento.",
        },
      },
    },
    {
      name: "locale",
      type: "text",
      required: false,
      index: true,
      admin: {
        description: {
          en: "Locale for field-level comments. Null = document-level (shown in all locales).",
          es: "Locale para comentarios de campo. Null = nivel de documento (visible en todos los locales).",
        },
      },
    },
    {
      name: "text",
      type: "textarea",
      required: true,
      label: {
        en: "Comment",
        es: "Comentario",
      },
    },
    {
      name: "mentions",
      type: "array",
      label: { en: "Mentions", es: "Menciones" },
      admin: { readOnly: true },
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
      label: {
        en: "Author",
        es: "Autor",
      },
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "isResolved",
      type: "checkbox",
      defaultValue: false,
      label: {
        en: "Resolved",
        es: "Resuelto",
      },
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "resolvedBy",
      type: "relationship",
      relationTo: "users",
      label: {
        en: "Resolved by",
        es: "Resuelto por",
      },
      admin: {
        position: "sidebar",
        condition: (_data, siblingData) => siblingData?.status === "resolved",
      },
    },
    {
      name: "resolvedAt",
      type: "date",
      label: {
        en: "Resolved at",
        es: "Resuelto el",
      },
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
          label: {
            en: "Tenant",
            es: "Inquilino",
          },
          admin: {
            position: "sidebar" as const,
          },
        },
      ]
    : []),
  ],
});
