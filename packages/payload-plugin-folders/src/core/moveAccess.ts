import type { PayloadRequest } from "payload";

import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { findRefusedChecks } from "./access.js";
import type { AccessCheck } from "./access.js";
import { createNestedRequest } from "./nestedRequest.js";
import type { MoveBlock, PlannedMoveItem } from "./move.js";
import { readPageRows } from "./pageRecords.js";

const itemKey = (ref: ItemRef): string => `${ref.collection}:${ref.id}`;

/**
 * Spec section 9 for a planned move, once every other check has passed and the order keys are
 * known: for each moved item, the collection's `update` access with `data: { folder, orderKey }`
 * (`parent` for a folder) and its `Where` result; when the item's published URL changes, the same
 * with `_status: 'published'` added, so a host that gates publishing inside `update` refuses it.
 * A folder carries that second question for every published page beneath it, because their URLs
 * change with it. Then `options.access.move`.
 *
 * Returns one `forbidden` block per refused item, or none. It reads and writes nothing else, so a
 * refusal leaves the tree untouched whatever the caller does with it.
 */
export const findForbiddenMoves = async ({
  items,
  labelOf,
  options,
  req,
  targetId,
}: {
  items: PlannedMoveItem[];
  labelOf: (ref: ItemRef) => Promise<string>;
  options: ResolvedOptions;
  req: PayloadRequest;
  targetId: FolderId | null;
}): Promise<MoveBlock[]> => {
  const checks: AccessCheck[] = [];
  /** The publish checks each moved item answers for, by item key. */
  const publishKeysByItem = new Map<string, string[]>();

  for (const item of items) {
    const key = itemKey(item.ref);
    const orderKey = item.orderKey;
    checks.push({
      collection: item.ref.collection,
      data:
        item.kind === "folder" ? { orderKey, parent: targetId } : { folder: targetId, orderKey },
      id: item.ref.id,
      key: `update:${key}`,
      operation: "update",
    });

    if (!item.parentChanges) {
      continue;
    }
    if (item.kind === "page") {
      if (item.changes.some((change) => change.kind === "page" && change.published)) {
        checks.push({
          collection: item.ref.collection,
          data: { _status: "published", folder: targetId, orderKey },
          id: item.ref.id,
          key: `publish:${key}`,
          operation: "update",
        });
        publishKeysByItem.set(key, [`publish:${key}`]);
      }
      continue;
    }

    // The pages beneath a moved folder keep their folder and order key; only their URL changes.
    const idsByCollection = new Map<string, FolderId[]>();
    for (const change of item.changes) {
      if (change.kind === "page" && change.published) {
        const ids = idsByCollection.get(change.collection) ?? [];
        if (!ids.some((id) => String(id) === String(change.id))) {
          ids.push(change.id);
        }
        idsByCollection.set(change.collection, ids);
      }
    }
    const ownedKeys: string[] = [];
    for (const [collection, ids] of idsByCollection) {
      const page = options.collections[collection];
      const rows = await readPageRows(req, page, ids);
      for (const id of ids) {
        const row = rows.get(String(id));
        if (!row) {
          continue;
        }
        const checkKey = `publish:${collection}:${id}`;
        checks.push({
          collection,
          data: { _status: "published", folder: row.folder, orderKey: row.orderKey },
          id,
          key: checkKey,
          operation: "update",
        });
        ownedKeys.push(checkKey);
      }
    }
    publishKeysByItem.set(key, ownedKeys);
  }

  const refused = await findRefusedChecks({ checks, req });
  const blocks: MoveBlock[] = [];

  for (const item of items) {
    const key = itemKey(item.ref);
    const label = await labelOf(item.ref);
    if (refused.has(`update:${key}`)) {
      blocks.push({
        item: item.ref,
        message: `You are not allowed to move "${label}" here`,
        reason: "forbidden",
      });
      continue;
    }
    const refusedPublishCount = (publishKeysByItem.get(key) ?? []).filter((publishKey) =>
      refused.has(publishKey)
    ).length;
    if (refusedPublishCount > 0) {
      blocks.push({
        item: item.ref,
        message:
          item.kind === "page"
            ? `"${label}" is published, and moving it changes its live URL: you need publish rights to move it`
            : `"${label}" holds ${refusedPublishCount} published ${refusedPublishCount === 1 ? "page" : "pages"} whose live URL would change: you need publish rights to move it`,
        reason: "forbidden",
      });
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

  return Promise.all(
    items.map(
      async (item): Promise<MoveBlock> => ({
        item: item.ref,
        message: `You are not allowed to move "${await labelOf(item.ref)}" here`,
        reason: "forbidden",
      })
    )
  );
};
