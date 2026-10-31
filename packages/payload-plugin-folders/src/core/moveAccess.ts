import type { PayloadRequest } from "payload";

import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { findRefusedChecks, isPublishRefusedBeneath } from "./access.js";
import type { AccessCheck } from "./access.js";
import type { MoveBlock, PlannedMoveItem } from "./move.js";
import { createNestedRequest } from "./nestedRequest.js";

const itemKey = (ref: ItemRef): string => `${ref.collection}:${ref.id}`;

// The messages name no title and no path: a refused user must learn nothing about content they may
// not touch, and a title is read with no read access check.
export const forbiddenMoveMessage = "You are not allowed to move this item here";
export const forbiddenPublishMessage =
  "Moving this item changes a live URL: you need publish rights";

/**
 * The `update` question every moved item answers before any other check reads the target's
 * content (spec section 5.4 order): `data` names only the folder the item would go to (`parent`
 * for a folder), because its order key is not known yet. A refused item gets a `forbidden` block
 * with a neutral message, so no later check can quote what sits in a folder the user may not
 * enter. Returns the refused items' keys.
 */
export const findItemsRefusedUpdate = async ({
  items,
  req,
  targetId,
}: {
  items: Array<{ kind: "folder" | "page"; ref: ItemRef }>;
  req: PayloadRequest;
  targetId: FolderId | null;
}): Promise<Set<string>> =>
  findRefusedChecks({
    checks: items.map((item) => ({
      collection: item.ref.collection,
      data: item.kind === "folder" ? { parent: targetId } : { folder: targetId },
      id: item.ref.id,
      key: itemKey(item.ref),
      operation: "update",
    })),
    req,
  });

/**
 * The late pass of spec section 9 for a planned move, once every other check has passed and the
 * order keys are known: for each moved item, the collection's `update` access with
 * `data: { folder, orderKey }` (`parent` for a folder) and its `Where` result; when the item's
 * published URL changes, the same with `_status: 'published'` added, so a host that gates
 * publishing inside `update` refuses it. A moved folder asks that second question for the
 * published pages beneath it once per collection and folder (their folder and order key stay, only
 * their URL changes). Then `options.access.move`.
 *
 * Returns one `forbidden` block per refused item, or none. It reads and writes nothing else, so a
 * refusal leaves the tree untouched whatever the caller does with it. It reads no title.
 */
export const findForbiddenMoves = async ({
  items,
  options,
  req,
  targetId,
}: {
  items: PlannedMoveItem[];
  options: ResolvedOptions;
  req: PayloadRequest;
  targetId: FolderId | null;
}): Promise<MoveBlock[]> => {
  const checks: AccessCheck[] = [];

  for (const item of items) {
    const { orderKey } = item;
    checks.push({
      collection: item.ref.collection,
      data:
        item.kind === "folder" ? { orderKey, parent: targetId } : { folder: targetId, orderKey },
      id: item.ref.id,
      key: `update:${itemKey(item.ref)}`,
      operation: "update",
    });
    if (
      item.kind === "page" &&
      item.parentChanges &&
      item.changes.some((change) => change.kind === "page" && change.published)
    ) {
      checks.push({
        collection: item.ref.collection,
        data: { _status: "published", folder: targetId, orderKey },
        id: item.ref.id,
        key: `publish:${itemKey(item.ref)}`,
        operation: "update",
      });
    }
  }

  const refused = await findRefusedChecks({ checks, req });
  const blocks: MoveBlock[] = [];

  for (const item of items) {
    const key = itemKey(item.ref);
    if (refused.has(`update:${key}`)) {
      blocks.push({ item: item.ref, message: forbiddenMoveMessage, reason: "forbidden" });
      continue;
    }
    let isPublishRefused = refused.has(`publish:${key}`);
    if (!isPublishRefused && item.kind === "folder" && item.parentChanges && item.folder) {
      isPublishRefused = await isPublishRefusedBeneath({
        folderIds: [
          item.folder.previous.id,
          ...(item.folder.subtree?.descendants.map((row) => row.previous.id) ?? []),
        ],
        options,
        req,
      });
    }
    if (isPublishRefused) {
      blocks.push({ item: item.ref, message: forbiddenPublishMessage, reason: "forbidden" });
    }
  }
  if (blocks.length > 0 || !options.access.move) {
    return blocks;
  }

  const isAllowed = await options.access.move({
    items: items.map((item) => item.ref),
    req: createNestedRequest(req),
    toFolder: targetId,
  });
  if (isAllowed) {
    return blocks;
  }

  return items.map(
    (item): MoveBlock => ({ item: item.ref, message: forbiddenMoveMessage, reason: "forbidden" })
  );
};
