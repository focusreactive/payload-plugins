import type {
  Access,
  CollectionConfig,
  Field,
  FieldAccess,
  TextFieldSingleValidation,
} from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { buildFolderAfterChange } from "../hooks/folders/afterChange.js";
import { buildFolderBeforeChange } from "../hooks/folders/beforeChange.js";
import { buildFolderBeforeValidate } from "../hooks/folders/beforeValidate.js";
import { folderBulkUpdateGuard } from "../hooks/folders/bulkUpdateGuard.js";
import { recordOverrideAccessHook } from "../hooks/folders/overrideAccess.js";
import { buildAcquireTreeLockHook, releaseUnboundTreeLockHook } from "../hooks/operationLock.js";

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

/**
 * A locale row of a folder holds `fullPath` for a locale that has no name or slug of its own (it
 * falls back to the default locale, spec section 3.2). A natively required localized text field
 * is `NOT NULL` in the locales table, so that row could not be written. Only the default locale
 * has to carry a value.
 */
const requiredInDefaultLocale: TextFieldSingleValidation = (value, { req }) => {
  const defaultLocale = req.payload.config.localization
    ? req.payload.config.localization.defaultLocale
    : null;
  const valueInDefaultLocale =
    defaultLocale !== null && value && typeof value === "object"
      ? (value as Record<string, unknown>)[defaultLocale]
      : value;
  const isDefaultLocaleWrite =
    defaultLocale === null || req.locale === defaultLocale || req.locale === "all";

  return isDefaultLocaleWrite && !valueInDefaultLocale ? "This field is required." : true;
};

/** `required` for a plain field; a localized one only needs its default locale. */
const segmentFieldRequirement = (localizeSegments: boolean) =>
  localizeSegments ? { validate: requiredInDefaultLocale } : { required: true as const };

export const buildFoldersCollection = (options: ResolvedOptions): CollectionConfig => {
  const { folders, localizeSegments } = options;
  const pageCollectionEntries = Object.values(options.collections);
  const pageTypeOptions = pageCollectionEntries.map((collection) => ({
    label: collection.label,
    value: collection.slug,
  }));

  const fields: Field[] = [
    {
      name: "name",
      type: "text",
      localized: localizeSegments,
      ...segmentFieldRequirement(localizeSegments),
    },
    {
      name: "slug",
      type: "text",
      index: true,
      localized: localizeSegments,
      ...segmentFieldRequirement(localizeSegments),
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
    hooks: options.disabled
      ? undefined
      : {
          afterChange: [buildFolderAfterChange(options)],
          afterOperation: [releaseUnboundTreeLockHook],
          beforeChange: [buildFolderBeforeChange(options)],
          beforeOperation: [
            folderBulkUpdateGuard,
            recordOverrideAccessHook,
            buildAcquireTreeLockHook(["create", "update"]),
          ],
          beforeValidate: [buildFolderBeforeValidate(options)],
        },
    indexes: [{ fields: ["parent", "orderKey"] }],
    labels: folders.labels,
    timestamps: true,
    trash: folders.trash,
    versions: false,
  };

  return folders.overrides ? folders.overrides(collection) : collection;
};
