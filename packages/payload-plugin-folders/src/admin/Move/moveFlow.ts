import type { ConfirmMoves, FolderId, ItemRef, TreeItem } from "../../types.js";
import { postMove } from "../api.js";
import type { FoldersApiContext, MoveBody, MovePreview, MoveResult } from "../api.js";
import { folderKeyOf, itemKeyOf } from "../store.js";
import type { OptimisticMove, TreeStore, TreeStoreState } from "../store.js";

/** Where a move puts the items: inside a folder, at the top or the bottom of it. */
export type MoveTarget = {
  position: "end" | "start";
  /** `null` is the top level. */
  toFolder: FolderId | null;
};

const isNestedIn = (item: TreeItem, folder: TreeItem): boolean =>
  folder.kind === "folder" &&
  (String(item.parentId) === String(folder.id) ||
    (item.ancestorIds ?? "").includes(`/${folder.id}/`));

/**
 * The selected rows that are not inside another selected folder. Those move with their folder, so
 * the request names the folder only and the store moves one row, not two.
 */
export const rootsOfSelection = (items: readonly TreeItem[]): TreeItem[] =>
  items.filter(
    (item) =>
      !items.some((other) => itemKeyOf(other) !== itemKeyOf(item) && isNestedIn(item, other))
  );

/**
 * The request body of a move and of its preview. Each item carries what the editor saw
 * (`expected`), so a tree that changed answers 409 instead of moving something else.
 * `redirects: false` is sent only when the editor unticked the box.
 */
export const buildMoveBody = (
  items: readonly TreeItem[],
  target: MoveTarget,
  redirects = true
): MoveBody => ({
  items: items.map((item) => ({
    collection: item.collection,
    expected: { orderKey: item.orderKey, parentId: item.parentId },
    id: item.id,
  })),
  position: target.position,
  ...(redirects ? {} : { redirects: false }),
  toFolder: target.toFolder,
});

export const optimisticMoveOf = (
  items: readonly TreeItem[],
  target: MoveTarget
): OptimisticMove => ({
  items: items.map((item) => ({ collection: item.collection, id: item.id })),
  position: target.position,
  toFolder: target.toFolder,
});

/**
 * Whether the confirm dialog opens (spec section 5.7): `always` for every move, `never` for none,
 * and `urlChange` (the default) when a published URL changes or the preview has a warning. A move
 * the preview refuses always opens it, whatever the mode, because the reasons are the only way
 * the editor learns why nothing happened.
 */
export const needsConfirmation = (mode: ConfirmMoves, preview: MovePreview): boolean => {
  if (!preview.ok) {
    return true;
  }
  if (mode === "never") {
    return false;
  }
  if (mode === "always") {
    return true;
  }

  return preview.warnings.length > 0 || preview.urlChanges.published > 0;
};

/** Where an item stood before a move: its folder and the row it came after. */
export type MovedSnapshot = {
  /** The sibling right above it that did not move, `null` when it was first in its folder. */
  anchor: ItemRef | null;
  item: ItemRef;
  parentId: FolderId | null;
};

/**
 * Records each moved row's folder and its previous sibling from the rows on screen, before the
 * move is applied: the undo needs them and the store forgets them as soon as the rows move.
 */
export const snapshotBeforeMove = (
  state: TreeStoreState,
  roots: readonly TreeItem[]
): MovedSnapshot[] => {
  const movedKeys = new Set(roots.map(itemKeyOf));

  return roots.map((item) => {
    const siblings = state.childrenByFolder[folderKeyOf(item.parentId)]?.items ?? [];
    const index = siblings.findIndex((sibling) => itemKeyOf(sibling) === itemKeyOf(item));
    let anchor: ItemRef | null = null;
    for (let before = index - 1; before >= 0; before -= 1) {
      const sibling = siblings[before] as TreeItem;
      if (!movedKeys.has(itemKeyOf(sibling))) {
        anchor = { collection: sibling.collection, id: sibling.id };
        break;
      }
    }

    return { anchor, item: { collection: item.collection, id: item.id }, parentId: item.parentId };
  });
};

/** One request that puts a group of items back, and the matching change of the rows on screen. */
export type UndoRequest = { body: MoveBody; optimistic: OptimisticMove };

/**
 * The requests that put the items back (spec section 5.7): each one after its previous sibling,
 * or at the top of its folder when it was first. Items that shared a folder and a previous sibling
 * go in one request, so the common case, one contiguous selection, is one request. Each item's
 * `expected` is what the move just gave it, so an item someone moved again in the meantime
 * answers 409 instead of being dragged back. Redirects are off: the move that is being undone
 * already wrote rows, and the old paths they stand for come back to life.
 */
export const buildUndoRequests = (
  snapshots: readonly MovedSnapshot[],
  result: MoveResult,
  movedTo: FolderId | null
): UndoRequest[] => {
  const moved = new Set(result.moved.map(itemKeyOf));
  const groups = new Map<string, MovedSnapshot[]>();
  for (const snapshot of snapshots) {
    if (moved.has(itemKeyOf(snapshot.item))) {
      const groupKey = `${snapshot.parentId ?? "root"}|${snapshot.anchor ? itemKeyOf(snapshot.anchor) : ""}`;
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), snapshot]);
    }
  }

  return [...groups.values()].map((group) => {
    const [first] = group as [MovedSnapshot];
    const items = group.map(({ item }) => ({
      ...item,
      expected: { orderKey: result.orderKeys[itemKeyOf(item)] ?? null, parentId: movedTo },
    }));

    const refs = items.map(({ collection, id }) => ({ collection, id }));

    // The store needs the folder the rows land in, which an `after` request names only by a row.
    return first.anchor
      ? {
          body: { after: first.anchor, items, redirects: false },
          optimistic: { after: first.anchor, items: refs, toFolder: first.parentId },
        }
      : {
          body: { items, position: "start", redirects: false, toFolder: first.parentId },
          optimistic: { items: refs, position: "start", toFolder: first.parentId },
        };
  });
};

export type MoveOutcome = {
  result: MoveResult;
  snapshots: MovedSnapshot[];
  target: MoveTarget;
};

/**
 * Runs one move as one request through the shared store: the rows move at once, and a failed or
 * refused request puts every row back and reads the folders again (the store's contract). The
 * rejection is rethrown for the caller to show.
 */
export const runMove = async (
  { context, store }: { context: FoldersApiContext; store: TreeStore },
  roots: readonly TreeItem[],
  target: MoveTarget,
  redirects: boolean
): Promise<MoveOutcome> => {
  const snapshots = snapshotBeforeMove(store.getState(), roots);
  const result = await store.runOptimisticMove(optimisticMoveOf(roots, target), () =>
    postMove(context, buildMoveBody(roots, target, redirects))
  );

  return { result, snapshots, target };
};

/**
 * Puts the moved items back, one request per group (see `buildUndoRequests`). Groups run one after
 * the other; a group that is refused leaves the earlier ones undone and throws.
 */
export const undoMove = async (
  { context, store }: { context: FoldersApiContext; store: TreeStore },
  outcome: MoveOutcome
): Promise<void> => {
  const requests = buildUndoRequests(outcome.snapshots, outcome.result, outcome.target.toFolder);
  for (const { body, optimistic } of requests) {
    await store.runOptimisticMove(optimistic, () => postMove(context, body));
  }
};
