import type { Access, CollectionConfig } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { folderRedirectsSlug } from "../constants.js";
import type { ResolvedOptions } from "../types.js";

const isLoggedIn: Access = ({ req }) => Boolean(req.user);
const nobody: Access = () => false;

/** Old paths and where they went. The plugin writes rows with overrideAccess: true. */
export const buildFolderRedirectsCollection = (options: ResolvedOptions): CollectionConfig => ({
  slug: folderRedirectsSlug,
  access: { create: nobody, delete: isLoggedIn, read: isLoggedIn, update: nobody },
  admin: { defaultColumns: ["fromPath", "locale", "kind", "target"], useAsTitle: "fromPath" },
  disableDuplicate: true,
  fields: [
    // `<locale>:<path>`, locale `-` when localization is off. One row per old path, so a newer
    // change of the same old path replaces the target.
    { name: "lookupKey", type: "text", index: true, required: true, unique: true },
    { name: "fromPath", type: "text", required: true },
    { name: "locale", type: "text" },
    {
      name: "kind",
      type: "select",
      defaultValue: "page",
      // A folderPrefix row stands for every path beneath it.
      options: ["page", "folderPrefix"],
      required: true,
    },
    {
      name: "target",
      type: "relationship",
      relationTo: [options.folders.slug, ...Object.keys(options.collections)].map(toCollectionSlug),
    },
  ],
  labels: { plural: "URL history", singular: "URL history entry" },
  timestamps: true,
  versions: false,
});
