import type { TreeItem } from "../../types.js";
import type { MoveTarget } from "../Move/moveFlow.js";
import { itemKeyOf } from "../store.js";

export type SiblingMoveDirection = "down" | "up";

/** Why a row cannot move one place: it is at that end, or the rows beyond are not loaded yet. */
export type SiblingMoveBlock = "first" | "last" | "unloaded";

export type SiblingMove =
  | { blocked: SiblingMoveBlock; target: null }
  | { blocked: null; target: MoveTarget };

/**
 * Where "Move up" and "Move down" put a row: one place along its folder's order (spec section
 * 7.5). Moving up lands after the row two above, or at the top of the folder when only one row is
 * above; moving down lands after the next row. Both name the folder the editor saw, so the move
 * goes through the same stale check as a drop (decision 27). `siblings` are the folder's loaded
 * rows in order and `hasMore` says rows beyond them exist: the row after the last loaded one is
 * not known then, so Move down waits for them.
 */
export const siblingMoveOf = (
  item: TreeItem,
  siblings: readonly TreeItem[],
  hasMore: boolean,
  direction: SiblingMoveDirection
): SiblingMove => {
  const index = siblings.findIndex((sibling) => itemKeyOf(sibling) === itemKeyOf(item));
  if (index === -1) {
    return { blocked: "unloaded", target: null };
  }

  if (direction === "up") {
    if (index === 0) {
      return { blocked: "first", target: null };
    }
    const anchor = siblings[index - 2];

    return {
      blocked: null,
      target: anchor
        ? { after: { collection: anchor.collection, id: anchor.id }, toFolder: item.parentId }
        : { position: "start", toFolder: item.parentId },
    };
  }

  const next = siblings[index + 1];
  if (!next) {
    return { blocked: hasMore ? "unloaded" : "last", target: null };
  }

  return {
    blocked: null,
    target: { after: { collection: next.collection, id: next.id }, toFolder: item.parentId },
  };
};
