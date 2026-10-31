import { APIError, ValidationError } from "payload";
import type { CollectionBeforeChangeHook } from "payload";

import { normalizeFolderReference, readFolderRecord } from "../../core/folderRecords.js";
import { keyForNewItem } from "../../core/orderKeys.js";
import { readPageRow } from "../../core/pageRecords.js";
import {
  classifyStructureEdit,
  namesOtherFolder,
  namesOtherOrderKey,
} from "../../core/structureGuard.js";
import type { FolderId, ResolvedOptions, ResolvedPageCollection } from "../../types.js";
import { isInternalWrite } from "../context.js";

/**
 * Spec section 5.3. The main row owns `folder`, `orderKey` and `structureRevision`; a save carries
 * them, it never sets them.
 *
 * - Create: accepts `folder` (create in place) and takes the top (or bottom) key of the folder
 *   under the tree lock, overwriting whatever the caller sent.
 * - Update: field access `update: () => false` already drops values sent by a request, so only a
 *   Local API call with `overrideAccess: true` reaches this hook with a structure of its own. One
 *   that names a different `folder` or `orderKey` at the stored revision is a deliberate edit and
 *   is refused. One with an older or absent revision comes from stale data (an old form, an
 *   autosave, a pending draft that is published, a scheduled publish, a version restore) and is
 *   replaced.
 * - Both ways the data written to the main row, and to any new version, carries the main row's
 *   structure, so a draft read never disagrees with the tree.
 *
 * The move core writes at database level and never reaches this hook.
 */
export const buildStructureGuard =
  (page: ResolvedPageCollection, options: ResolvedOptions): CollectionBeforeChangeHook =>
  async ({ data, operation, originalDoc, req }) => {
    if (isInternalWrite(req)) {
      return data;
    }

    if (operation === "update") {
      const stored = await readPageRow(req, page, originalDoc?.id as FolderId);
      if (!stored) {
        return data;
      }

      const requestedFolder =
        data.folder === undefined ? null : normalizeFolderReference(data.folder);
      const edit = classifyStructureEdit({
        changesStructure:
          (requestedFolder !== null && namesOtherFolder(requestedFolder, stored.folder)) ||
          namesOtherOrderKey(data.orderKey, stored.orderKey),
        incomingRevision: data.structureRevision,
        missingRevisionIsStale: true,
        storedRevision: stored.structureRevision,
      });
      if (edit === "deliberate") {
        throw new APIError("Use moveItems() to move content", 400);
      }

      data.folder = stored.folder as never;
      data.orderKey = stored.orderKey as never;
      data.structureRevision = stored.structureRevision as never;

      return data;
    }

    if (operation !== "create") {
      return data;
    }

    const reference = normalizeFolderReference(data.folder);
    const folderExists =
      !reference.invalid &&
      (reference.id === null || (await readFolderRecord(req, options, reference.id)));
    if (!folderExists) {
      throw new ValidationError({
        collection: page.slug,
        errors: [
          {
            message:
              reference.id === null && reference.invalid
                ? "Use null for the top level of the tree: 0 is not a folder"
                : "The folder does not exist",
            path: "folder",
          },
        ],
        req,
      });
    }

    data.folder = reference.id as never;
    data.orderKey = await keyForNewItem(req, options, reference.id);

    return data;
  };
