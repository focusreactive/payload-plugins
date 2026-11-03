import type { Access, CollectionConfig } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { folderOperationsSlug } from "../constants.js";

/** A record is its owner's: another signed-in user reads nothing of it through the stock REST routes. */
const ownRecords: Access = ({ req }) => (req.user ? { createdBy: { equals: req.user.id } } : false);
const nobody: Access = () => false;

/** Progress records of batch publish, delete, duplicate and mirror runs (spec section 5.8). */
export const buildFolderOperationsCollection = (userCollectionSlug: string): CollectionConfig => ({
  slug: folderOperationsSlug,
  access: { create: nobody, delete: nobody, read: ownRecords, update: nobody },
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
      options: ["running", "done", "failed", "abandoned"],
      required: true,
    },
    { name: "error", type: "text" },
    { name: "createdBy", type: "relationship", relationTo: toCollectionSlug(userCollectionSlug) },
  ],
  timestamps: true,
  versions: false,
});
