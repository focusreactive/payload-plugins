import type { CollectionConfig, Field, FieldAccess } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";

import type { ResolvedOptions, ResolvedPageCollection } from "../types.js";

const nobody: FieldAccess = () => false;

/** The segment field the plugin adds when the host's collection has none. */
export const buildSegmentField = (page: ResolvedPageCollection): Field => ({
  name: page.segmentField,
  type: "text",
  index: true,
  localized: page.segmentLocalized,
});

/**
 * `access.update: () => false` drops a request's pathSegment in beforeValidate, but a field
 * beforeChange hook still sets the value afterwards, on create and update, for drafts and per
 * locale (tests/int/pathSegmentAccess.int.test.ts, build-lead decision 11). So the access stays.
 */
export const buildPathSegmentField = (segmentLocalized: boolean): Field => ({
  name: "pathSegment",
  type: "text",
  access: { update: nobody },
  admin: { hidden: true },
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
    index: true,
  },
  {
    name: "structureRevision",
    type: "number",
    admin: { hidden: true, readOnly: true },
    defaultValue: 0,
  },
  {
    name: "isFolderRoot",
    type: "checkbox",
    admin: { position: "sidebar" },
    defaultValue: false,
    index: true,
  },
  buildPathSegmentField(page.segmentLocalized),
  {
    name: "folderPath",
    type: "text",
    admin: { hidden: true },
    // A string path makes Payload resolve queries and sorts through the related folder's column.
    virtual: "folder.fullPath",
  },
  {
    name: "fullPath",
    type: "text",
    admin: { position: "sidebar", readOnly: true },
    hooks: {
      // Composed from folderPath and pathSegment from P-08 on.
      afterRead: [() => null],
    },
    virtual: true,
  },
];

export const addPageFields = (
  collection: CollectionConfig,
  page: ResolvedPageCollection,
  options: ResolvedOptions
): CollectionConfig => ({
  ...collection,
  fields: [
    ...collection.fields,
    ...(page.segmentFieldExists ? [] : [buildSegmentField(page)]),
    ...buildPageFields(page, options),
  ],
  indexes: [...(collection.indexes ?? []), { fields: ["folder", "orderKey"] }],
});
