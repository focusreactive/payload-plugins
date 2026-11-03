import { APIError } from "payload";
import type { FieldHook, PayloadRequest } from "payload";

import { forbiddenRenameMessage, isPublishRefusedBeneath } from "../../core/access.js";
import { readFolderDescendants } from "../../core/subtree.js";
import type { FolderId, ResolvedOptions } from "../../types.js";
import { isInternalWrite } from "../context.js";

// The folder `beforeChange` hook knows a save renames the folder; the `slug` field's hook knows
// whether the caller overrode access, which a collection hook is never told. The first leaves a
// mark for the second. It is kept per request and folder, and every update sets or clears it, so a
// save that failed between the two hooks cannot leave a mark that a later save acts on.
const renamesByRequest = new WeakMap<PayloadRequest, Set<string>>();

export const markFolderRename = (req: PayloadRequest, id: FolderId, isRename: boolean): void => {
  const marked = renamesByRequest.get(req) ?? new Set<string>();
  if (isRename) {
    marked.add(String(id));
  } else {
    marked.delete(String(id));
  }
  renamesByRequest.set(req, marked);
};

/**
 * A rename changes every live URL beneath the folder, so it needs the publish rights a move of
 * those pages would (decision 23): the publish question once per collection and folder. This is a
 * field hook because Payload hands field hooks the `overrideAccess` of their own operation. A
 * nested Local API call on the same request, made by a host's access function or hook, has its own
 * operation and cannot change it. A system call (`overrideAccess: true`) is never asked. The hook
 * runs after the collection hooks and before the write, so a refusal writes nothing.
 */
export const buildSlugPublishRightsHook =
  (options: ResolvedOptions): FieldHook =>
  async ({ operation, originalDoc, overrideAccess, req }) => {
    if (operation !== "update" || isInternalWrite(req) || !originalDoc?.id) {
      return;
    }
    const marked = renamesByRequest.get(req);
    if (!marked?.delete(String(originalDoc.id)) || overrideAccess) {
      return;
    }
    const descendants = await readFolderDescendants(req, options, originalDoc.id);
    const isRefused = await isPublishRefusedBeneath({
      folderIds: [originalDoc.id, ...descendants.map((folder) => folder.id)],
      options,
      req,
    });
    if (isRefused) {
      throw new APIError(forbiddenRenameMessage, 403, null, true);
    }
  };
