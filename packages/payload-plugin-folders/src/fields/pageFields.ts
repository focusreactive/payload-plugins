import type { CollectionConfig, Field, FieldAccess, FieldHook } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { buildPageAfterChange } from "../hooks/pages/afterChange.js";
import {
  buildSegmentBeforeDuplicate,
  resetIsFolderRootOnDuplicate,
  resetOrderKeyOnDuplicate,
  resetStructureRevisionOnDuplicate,
} from "../hooks/pages/beforeDuplicate.js";
import { buildBulkUpdateGuard } from "../hooks/pages/bulkUpdateGuard.js";
import { buildPageBeforeValidate } from "../hooks/pages/beforeValidate.js";
import { buildStructureGuard } from "../hooks/pages/structureGuard.js";
import {
  buildFullPathAfterRead,
  folderPathAfterRead,
  selectFullPathInputsHook,
} from "../hooks/pages/fullPathAfterRead.js";
import { buildPathSegmentHook } from "../hooks/pages/pathSegment.js";
import { buildAcquireTreeLockHook, releaseUnboundTreeLockHook } from "../hooks/operationLock.js";

import type { ResolvedOptions, ResolvedPageCollection } from "../types.js";

const nobody: FieldAccess = () => false;

/** The segment field the plugin adds when the host's collection has none. */
export const buildSegmentField = (
  page: ResolvedPageCollection,
  options: ResolvedOptions
): Field => ({
  name: page.segmentField,
  type: "text",
  ...(options.disabled
    ? {}
    : { hooks: { beforeDuplicate: [buildSegmentBeforeDuplicate(options)] } }),
  index: true,
  localized: page.segmentLocalized,
});

/**
 * Adds the duplicate hook to the host's own segment field, wherever the collection nests it. A hook
 * the host already set on that field stays in front of ours.
 */
const withSegmentBeforeDuplicate = (
  fields: Field[],
  segmentField: string,
  hook: FieldHook
): Field[] =>
  fields.map((field): Field => {
    if (field.type === "tabs") {
      return {
        ...field,
        tabs: field.tabs.map((tab) =>
          "name" in tab && typeof tab.name === "string"
            ? tab
            : { ...tab, fields: withSegmentBeforeDuplicate(tab.fields, segmentField, hook) }
        ),
      };
    }
    if (
      field.type === "row" ||
      field.type === "collapsible" ||
      (field.type === "group" && !("name" in field && field.name))
    ) {
      return {
        ...field,
        fields: withSegmentBeforeDuplicate(field.fields, segmentField, hook),
      } as Field;
    }
    if ("name" in field && field.name === segmentField && field.type === "text") {
      return {
        ...field,
        hooks: {
          ...field.hooks,
          beforeDuplicate: [...(field.hooks?.beforeDuplicate ?? []), hook],
        },
      };
    }

    return field;
  });

/**
 * `access.update: () => false` drops a request's pathSegment in beforeValidate, but a field
 * beforeChange hook still sets the value afterwards, on create and update, for drafts and per
 * locale (tests/int/pathSegmentAccess.int.test.ts, build-lead decision 11). So the access stays.
 * Without `segmentField` the field carries no hook; the access probe builds it that way.
 */
export const buildPathSegmentField = (segmentLocalized: boolean, segmentField?: string): Field => ({
  name: "pathSegment",
  type: "text",
  access: { update: nobody },
  admin: { hidden: true },
  ...(segmentField === undefined
    ? {}
    : { hooks: { beforeChange: [buildPathSegmentHook(segmentField, segmentLocalized)] } }),
  index: true,
  localized: segmentLocalized,
});

export const buildPageFields = (
  page: ResolvedPageCollection,
  options: ResolvedOptions
): Field[] => [
  {
    name: "folder",
    type: "relationship",
    access: { update: nobody },
    admin: { position: "sidebar" },
    hasMany: false,
    index: true,
    relationTo: toCollectionSlug(options.folders.slug),
  },
  {
    name: "orderKey",
    type: "text",
    access: { update: nobody },
    admin: { hidden: true },
    ...(options.disabled ? {} : { hooks: { beforeDuplicate: [resetOrderKeyOnDuplicate] } }),
    index: true,
  },
  {
    name: "structureRevision",
    type: "number",
    access: { update: nobody },
    admin: { hidden: true, readOnly: true },
    defaultValue: 0,
    ...(options.disabled
      ? {}
      : { hooks: { beforeDuplicate: [resetStructureRevisionOnDuplicate] } }),
  },
  {
    name: "isFolderRoot",
    type: "checkbox",
    admin: { position: "sidebar" },
    defaultValue: false,
    ...(options.disabled ? {} : { hooks: { beforeDuplicate: [resetIsFolderRootOnDuplicate] } }),
    index: true,
  },
  buildPathSegmentField(page.segmentLocalized, options.disabled ? undefined : page.segmentField),
  {
    name: "folderPath",
    type: "text",
    admin: { hidden: true },
    ...(options.disabled ? {} : { hooks: { afterRead: [folderPathAfterRead] } }),
    // A string path makes Payload resolve queries and sorts through the related folder's column.
    virtual: "folder.fullPath",
  },
  {
    name: "fullPath",
    type: "text",
    admin: { position: "sidebar", readOnly: true },
    // Composed by the collection's afterRead hook (buildFullPathAfterRead), not a field hook. A
    // disabled plugin keeps the schema and answers null.
    ...(options.disabled ? { hooks: { afterRead: [() => null] } } : {}),
    virtual: true,
  },
];

/** Appended after the host's own hooks, so the host's `data` changes are in place when they run. */
const addPageHooks = (
  collection: CollectionConfig,
  options: ResolvedOptions
): CollectionConfig["hooks"] => {
  const hooks = collection.hooks ?? {};

  return {
    ...hooks,
    afterChange: [
      ...(hooks.afterChange ?? []),
      buildPageAfterChange(options.collections[collection.slug], options),
    ],
    afterOperation: [...(hooks.afterOperation ?? []), releaseUnboundTreeLockHook],
    afterRead: [...(hooks.afterRead ?? []), buildFullPathAfterRead()],
    beforeChange: [
      ...(hooks.beforeChange ?? []),
      buildStructureGuard(options.collections[collection.slug], options),
    ],
    beforeOperation: [
      ...(hooks.beforeOperation ?? []),
      buildBulkUpdateGuard(options.collections[collection.slug]),
      buildAcquireTreeLockHook(["create", "update", "restoreVersion"]),
      selectFullPathInputsHook,
    ],
    beforeValidate: [
      ...(hooks.beforeValidate ?? []),
      buildPageBeforeValidate(options.collections[collection.slug], options),
    ],
  };
};

export const addPageFields = (
  collection: CollectionConfig,
  page: ResolvedPageCollection,
  options: ResolvedOptions
): CollectionConfig => {
  const hostFields =
    page.segmentFieldExists && !options.disabled
      ? withSegmentBeforeDuplicate(
          collection.fields,
          page.segmentField,
          buildSegmentBeforeDuplicate(options)
        )
      : collection.fields;

  return {
    ...collection,
    ...(options.disabled ? {} : { hooks: addPageHooks(collection, options) }),
    fields: [
      ...hostFields,
      ...(page.segmentFieldExists ? [] : [buildSegmentField(page, options)]),
      ...buildPageFields(page, options),
    ],
    indexes: [...(collection.indexes ?? []), { fields: ["folder", "orderKey"] }],
  };
};
