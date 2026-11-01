import type { PayloadRequest } from "payload";

import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { findRefusedChecks } from "./access.js";
import type { AccessCheck } from "./access.js";
import type { MoveBlock, PlannedMoveItem } from "./move.js";
import { createNestedRequest } from "./nestedRequest.js";

const itemKey = (ref: ItemRef): string => `${ref.collection}:${ref.id}`;

// The messages name no title and no path: a refused user must learn nothing about content they may
// not touch, and a title is read with no read access check.
export const forbiddenMoveMessage = "You are not allowed to move this item here";
export const forbiddenPublishMessage =
  "Moving this item changes a live URL: you need publish rights";

export const publishKeyOf = (ref: ItemRef): string => `publish:${itemKey(ref)}`;

/**
 * The access questions every moved item answers before any other check reads the target's content
 * (spec section 5.4 order): the collection's `update` with `data` naming only the folder the item
 * would go to (`parent` for a folder), because its order key is not known yet, and, for a page
 * whose published URL changes (`changesLiveUrl`), the publish question: `update` with
 * `_status: 'published'` (spec section 9). A refused item gets a `forbidden` block with a neutral
 * message, so no later check can quote what sits in a folder the user may not enter, or in a place
 * a refusal of publish rights would otherwise be hidden behind a path conflict.
 *
 * Returns the refused items' keys: `itemKey` for a refused update, `publish:` and the key for a
 * refused publish question.
 */
export const findItemsRefusedUpdate = async ({
  items,
  req,
  targetId,
}: {
  items: Array<{ changesLiveUrl?: boolean; kind: "folder" | "page"; ref: ItemRef }>;
  req: PayloadRequest;
  targetId: FolderId | null;
}): Promise<Set<string>> =>
  findRefusedChecks({
    checks: items.flatMap((item): AccessCheck[] => [
      {
        collection: item.ref.collection,
        data: item.kind === "folder" ? { parent: targetId } : { folder: targetId },
        id: item.ref.id,
        key: itemKey(item.ref),
        operation: "update",
      },
      ...(item.changesLiveUrl
        ? [
            {
              collection: item.ref.collection,
              data: { _status: "published", folder: targetId },
              id: item.ref.id,
              key: publishKeyOf(item.ref),
              operation: "update",
            } satisfies AccessCheck,
          ]
        : []),
    ]),
    req,
  });

/**
 * The late pass of spec section 9 for a planned move, once every other check has passed and the
 * order keys are known: for each moved item, the collection's `update` access with
 * `data: { folder, orderKey }` (`parent` for a folder) and its `Where` result. The publish
 * questions (a page whose URL changes, the published pages beneath a moved folder) were asked
 * before any conflict was read, because their refusal must not hide behind a conflict message.
 * Then `options.access.move`.
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
  }

  const refused = await findRefusedChecks({ checks, req });
  const blocks: MoveBlock[] = items
    .filter((item) => refused.has(`update:${itemKey(item.ref)}`))
    .map((item) => ({ item: item.ref, message: forbiddenMoveMessage, reason: "forbidden" }));
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
