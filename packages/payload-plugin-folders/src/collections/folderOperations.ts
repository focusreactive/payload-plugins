import type { Access, CollectionConfig } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { folderOperationsSlug } from "../constants.js";

const isLoggedIn: Access = ({ req }) => Boolean(req.user);
const nobody: Access = () => false;

/** Progress records of batch publish, delete, duplicate and mirror runs (spec section 5.8). */
export const buildFolderOperationsCollection = (userCollectionSlug: string): CollectionConfig => ({
  slug: folderOperationsSlug,
  access: { create: nobody, delete: nobody, read: isLoggedIn, update: nobody },
  admin: { hidden: true },
  disableDuplicate: true,
  fields: [
    {
      name: "kind",
      type: "select",
      options: ["publish", "unpublish", "delete", "duplicate", "mirrorRedirects"],
      required: true,
    },
    { name: "items", type: "json" },
    { name: "cursor", type: "json" },
    { name: "done", type: "number", defaultValue: 0 },
    { name: "total", type: "number", defaultValue: 0 },
    {
      name: "status",
      type: "select",
      defaultValue: "running",
      options: ["running", "done", "failed"],
      required: true,
    },
    { name: "error", type: "text" },
    { name: "createdBy", type: "relationship", relationTo: toCollectionSlug(userCollectionSlug) },
  ],
  timestamps: true,
  versions: false,
});
