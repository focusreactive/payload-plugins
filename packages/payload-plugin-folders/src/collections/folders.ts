import type { Access, CollectionConfig, Field, FieldAccess } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";

import type { ResolvedOptions } from "../types.js";

const isLoggedIn: Access = ({ req }) => Boolean(req.user);
const nobody: FieldAccess = () => false;

/**
 * Field access `update: () => false` only strips an incoming value in beforeValidate, and only when
 * the caller does not override access. The move core writes with overrideAccess: true.
 */
const neverUpdatedByRequest = { update: nobody };
// Written by plugin hooks only: a request can neither set nor change them.
const neverWrittenByRequest = { create: nobody, update: nobody };

export const buildFoldersCollection = (options: ResolvedOptions): CollectionConfig => {
  const { folders, localizeSegments } = options;
  const pageCollectionEntries = Object.values(options.collections);
  const pageTypeOptions = pageCollectionEntries.map((collection) => ({
    label: collection.label,
    value: collection.slug,
  }));

  const fields: Field[] = [
    { name: "name", type: "text", localized: localizeSegments, required: true },
    {
      name: "slug",
      type: "text",
      index: true,
      localized: localizeSegments,
      required: true,
    },
    {
      name: "parent",
      type: "relationship",
      access: neverUpdatedByRequest,
      hasMany: false,
      index: true,
      relationTo: toCollectionSlug(folders.slug),
    },
    {
      name: "orderKey",
      type: "text",
      access: neverUpdatedByRequest,
      admin: { hidden: true },
      index: true,
    },
    {
      name: "fullPath",
      type: "text",
      access: neverWrittenByRequest,
      admin: { position: "sidebar", readOnly: true },
      localized: localizeSegments,
      unique: true,
    },
    {
      name: "ancestorIds",
      type: "text",
      access: neverWrittenByRequest,
      admin: { hidden: true },
      index: true,
    },
    {
      name: "depth",
      type: "number",
      access: neverWrittenByRequest,
      admin: { hidden: true },
      index: true,
    },
    {
      name: "structureRevision",
      type: "number",
      access: neverWrittenByRequest,
      admin: { hidden: true },
      defaultValue: 0,
    },
    {
      name: "allowedTypes",
      type: "select",
      hasMany: true,
      options: pageTypeOptions,
    },
    { name: "defaultType", type: "select", options: pageTypeOptions },
    { name: "lockSubfolderTypes", type: "checkbox" },
    {
      name: "typesLockedBy",
      type: "relationship",
      access: neverWrittenByRequest,
      admin: { readOnly: true },
      hasMany: false,
      relationTo: toCollectionSlug(folders.slug),
    },
  ];

  const collection: CollectionConfig = {
    slug: folders.slug,
    access: {
      create: isLoggedIn,
      delete: isLoggedIn,
      read: () => true,
      update: isLoggedIn,
      ...folders.access,
    },
    admin: { useAsTitle: "name" },
    // Folder copies go through the deep duplicate, never the stock Duplicate button.
    disableDuplicate: true,
    fields,
    indexes: [{ fields: ["parent", "orderKey"] }],
    labels: folders.labels,
    timestamps: true,
    trash: folders.trash,
    versions: false,
  };

  return folders.overrides ? folders.overrides(collection) : collection;
};
