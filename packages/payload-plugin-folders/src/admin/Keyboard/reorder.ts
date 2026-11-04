import type { TreeItem } from "../../types.js";
import { siblingMoveOf } from "../ContextMenu/siblingMove.js";
import type { SiblingMoveBlock, SiblingMoveDirection } from "../ContextMenu/siblingMove.js";
import { optimisticMoveOf } from "../Move/moveFlow.js";
import type { MoveTarget } from "../Move/moveFlow.js";
import { folderKeyOf } from "../store.js";
import type { OptimisticHandle, TreeStore } from "../store.js";
import { itemKey } from "../../core/itemKey.js";

/** How long repeated Alt+Up and Alt+Down wait after the last press before one move is sent (spec section 7.6). */
export const reorderDelayMs = 800;

/** The one move that three presses of Alt+Down become. */
export type ReorderCommit = {
  /** The row as it was before the first press: what the request's `expected` states. */
  item: TreeItem;
  /**
   * Puts the rows back as they were before the first press. The move flow calls it right before it
   * applies the real move, in the same turn, so the rows do not jump back and forth.
   */
  onBeforeApply: () => void;
  /** The move did not start (refused at preview, dismissed at the confirm, dropped): the rows go back. */
  onAbandon: () => void;
  target: MoveTarget;
};

export type PressResult =
  | { blocked: SiblingMoveBlock; type: "blocked" }
  | { position: number; total: number; type: "moved" }
  /** Another row's presses are still waiting: they were sent now, and this press did nothing. */
  | { type: "flushed" };

export type ReorderController = {
  /** Drops the pending presses and puts the rows back. */
  cancel: () => void;
  /** Sends the pending presses now. */
  flush: () => void;
  /** Whether presses are waiting. */
  hasPending: () => boolean;
  press: (item: TreeItem, direction: SiblingMoveDirection) => PressResult;
};

type Pending = {
  handles: OptimisticHandle[];
  original: TreeItem;
  originalIndex: number;
  timer: ReturnType<typeof setTimeout>;
};

/** Puts every row the presses moved back, last move first. */
const rollbackAll = (session: Pending): void => {
  for (const handle of session.handles.toReversed()) {
    handle.rollback();
  }
  session.handles = [];
};

/**
 * The debounced keyboard reorder of spec section 7.6. Each press moves the row one place in the
 * rows on screen at once (an optimistic move of the shared store); when no press has followed for
 * `delayMs`, one move is handed to `commit` for the place the row ended up in, so three presses
 * are one request, one confirmation and one Undo.
 */
export const createReorderController = ({
  commit,
  delayMs = reorderDelayMs,
  store,
}: {
  commit: (request: ReorderCommit) => void;
  delayMs?: number;
  store: TreeStore;
}): ReorderController => {
  let pending: Pending | null = null;

  const send = (): void => {
    const session = pending;
    if (session === null) {
      return;
    }
    pending = null;
    clearTimeout(session.timer);
    const key = itemKey(session.original);
    const siblings = store.getState().childrenByFolder[folderKeyOf(session.original.parentId)];
    const index = siblings?.items.findIndex((sibling) => itemKey(sibling) === key) ?? -1;
    // The row left its folder under the editor's hands, or ended where it began: nothing to send.
    if (siblings === undefined || index === -1 || index === session.originalIndex) {
      rollbackAll(session);

      return;
    }
    const above = siblings.items[index - 1];
    commit({
      item: session.original,
      onAbandon: () => rollbackAll(session),
      onBeforeApply: () => rollbackAll(session),
      target: above
        ? {
            after: { collection: above.collection, id: above.id },
            toFolder: session.original.parentId,
          }
        : { position: "start", toFolder: session.original.parentId },
    });
  };

  return {
    cancel: () => {
      if (pending !== null) {
        clearTimeout(pending.timer);
        rollbackAll(pending);
        pending = null;
      }
    },
    flush: send,
    hasPending: () => pending !== null,
    press: (item, direction) => {
      const key = itemKey(item);
      if (pending !== null && itemKey(pending.original) !== key) {
        send();

        return { type: "flushed" };
      }
      const siblings = store.getState().childrenByFolder[folderKeyOf(item.parentId)];
      const current = siblings?.items.find((sibling) => itemKey(sibling) === key);
      if (siblings === undefined || current === undefined) {
        return { blocked: "unloaded", type: "blocked" };
      }
      const move = siblingMoveOf(current, siblings.items, siblings.hasMore, direction);
      if (move.target === null) {
        return { blocked: move.blocked, type: "blocked" };
      }

      const handle = store.applyOptimisticMove(optimisticMoveOf([current], move.target));
      if (pending === null) {
        pending = {
          handles: [],
          original: current,
          originalIndex: siblings.items.indexOf(current),
          timer: setTimeout(send, delayMs),
        };
      } else {
        clearTimeout(pending.timer);
        pending.timer = setTimeout(send, delayMs);
      }
      pending.handles.push(handle);
      const after = store.getState().childrenByFolder[folderKeyOf(item.parentId)];

      return {
        position: (after?.items.findIndex((sibling) => itemKey(sibling) === key) ?? 0) + 1,
        total: after?.items.length ?? 0,
        type: "moved",
      };
    },
  };
};
