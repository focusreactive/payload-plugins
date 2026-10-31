import type {
  Access,
  CollectionConfig,
  Field,
  FieldAccess,
  TextFieldSingleValidation,
} from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { pluginSlug } from "../constants.js";
import { buildRedirectCleanupBeforeDelete } from "../hooks/beforeDelete.js";
import { buildFolderAfterChange } from "../hooks/folders/afterChange.js";
import { buildFolderBeforeChange } from "../hooks/folders/beforeChange.js";
import { buildFolderBeforeValidate } from "../hooks/folders/beforeValidate.js";
import { folderBulkUpdateGuard } from "../hooks/folders/bulkUpdateGuard.js";
import { buildSlugPublishRightsHook } from "../hooks/folders/renamePublishRights.js";
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

/**
 * A folder under a type lock gets these fields read-only in its edit view, with a note naming the
 * folder that locked them. The server refuses an edit of them either way.
 */
const lockableTypeField = (
  component: "LockableCheckboxField" | "LockableSelectField",
  options: ResolvedOptions
): { components?: { Field: string } } =>
  options.disabled ? {} : { components: { Field: `${pluginSlug}/client#${component}` } };

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
      // With the plugin disabled the schema stays and no hook runs.
      ...(options.disabled
        ? {}
        : { hooks: { beforeChange: [buildSlugPublishRightsHook(options)] } }),
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
      admin: lockableTypeField("LockableSelectField", options),
      hasMany: true,
      options: pageTypeOptions,
    },
    {
      name: "defaultType",
      type: "select",
      admin: lockableTypeField("LockableSelectField", options),
      options: pageTypeOptions,
    },
    {
      name: "lockSubfolderTypes",
      type: "checkbox",
      admin: lockableTypeField("LockableCheckboxField", options),
    },
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
    admin: {
      // The tree view is the folders list view; the sidebar tab and the stock list stay available.
      ...(options.disabled
        ? {}
        : {
            components: {
              edit: {
                // The heading shows the default language's name where this language has none.
                beforeDocumentControls: [`${pluginSlug}/client#FolderTitleFallback`],
                // Saving a folder asks first when it renames URLs or locks subfolder types.
                SaveButton: `${pluginSlug}/client#FolderSaveButton`,
              },
              ...(options.admin.treeView
                ? { views: { list: { Component: `${pluginSlug}/rsc#TreeViewServer` } } }
                : {}),
            },
          }),
      useAsTitle: "name",
    },
    // Plain values the admin's server component hands to the browser.
    custom: {
      [pluginSlug]: {
        confirmMoves: options.admin.confirmMoves,
        enforceAllowedTypesOnMove: options.enforceAllowedTypesOnMove,
        foldersSlug: folders.slug,
        // The link builder itself is a function and stays on the server; the menu asks the
        // `preview-url` endpoint for each link.
        hasPreviewUrl: Boolean(options.admin.previewUrl),
        maxDepth: options.maxDepth,
        // What the settings drawers write a page's title and segment into.
        pageFields: Object.fromEntries(
          pageCollectionEntries.map((pageCollection) => [
            pageCollection.slug,
            { segmentField: pageCollection.segmentField, titleField: pageCollection.titleField },
          ])
        ),
        pageSize: options.admin.pageSize,
        reservedRootSegments: options.reservedRootSegments,
        typeLabels: Object.fromEntries(
          pageCollectionEntries.map((pageCollection) => [
            pageCollection.slug,
            { explicit: pageCollection.labelIsExplicit, label: pageCollection.label },
          ])
        ),
      },
    },
    // Folder copies go through the deep duplicate, never the stock Duplicate button.
    disableDuplicate: true,
    fields,
    hooks: options.disabled
      ? undefined
      : {
          afterChange: [buildFolderAfterChange(options)],
          afterOperation: [releaseUnboundTreeLockHook],
          beforeChange: [buildFolderBeforeChange(options)],
          beforeDelete: [buildRedirectCleanupBeforeDelete(folders.slug)],
          beforeOperation: [folderBulkUpdateGuard, buildAcquireTreeLockHook(["create", "update"])],
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
