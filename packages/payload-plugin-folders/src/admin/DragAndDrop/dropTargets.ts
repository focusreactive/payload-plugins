import type { FolderId, ItemRef, TreeItem } from "../../types.js";
import { isNestedIn, rootsOfSelection } from "../Move/moveFlow.js";
import type { MoveTarget } from "../Move/moveFlow.js";
import { findLoadedFolder, folderKeyOf, itemKeyOf, loadedItemsOf } from "../store.js";
import type { TreeStoreState } from "../store.js";
import type { TreeRowModel } from "../Tree/useTreeData.js";
import type { DropZone } from "./dropZones.js";

/** What the checks that run on the rows on screen need to know about the site. */
export type DropRules = {
  /** Off turns a folder's allowed types into a warning of the preview instead of a refusal. */
  enforceAllowedTypes: boolean;
  maxDepth: number;
  reservedRootSegments: readonly string[];
  /** Page collection slug to its label. */
  typeLabels: Readonly<Record<string, string>>;
};

/** Why a gap cannot take the dragged rows, known from the rows on screen. */
export type DropRefusal =
  | {
      kind: "conflict";
      /** `null` is a folder; a page is named. */
      otherTitle: string | null;
      path: string;
      title: string;
    }
  | { kind: "cycle" }
  | { depth: number; kind: "depth"; limit: number }
  | { dot: boolean; kind: "reserved"; segment: string }
  | { kind: "type"; path: string; types: string[] };

/** Where the line or the highlight of a gap is drawn. */
export type DropIndicator =
  | { edge: "bottom" | "top"; level: number; rowKey: string }
  | { edge: "inside"; level: number; rowKey: string };

export type DropResolution = {
  indicator: DropIndicator;
  /** The drop would leave every dragged row where it is, so releasing it sends nothing. */
  isNoOp: boolean;
  refusal: DropRefusal | null;
  target: MoveTarget;
  /** The folder the rows land in; `null` is the top level. */
  targetFolder: TreeItem | null;
};

/**
 * The rows a paste moves: the cut rows as the store holds them now, less the rows inside another
 * cut folder, which travel with it and are not checked on their own.
 */
export const pastedItemsOf = (cut: readonly TreeItem[], state: TreeStoreState): TreeItem[] => {
  const loaded = new Map(loadedItemsOf(state).map((row) => [itemKeyOf(row), row]));

  return rootsOfSelection(cut.map((row) => loaded.get(itemKeyOf(row)) ?? row));
};

/**
 * The rows a drag carries. Dragging a ticked row carries the whole selection (spec section 7.3),
 * less the rows inside another ticked folder, which travel with it; dragging any other row carries
 * that row alone and leaves the selection as it is.
 */
export const draggedItemsOf = (
  grabbed: TreeItem,
  selectedItems: readonly TreeItem[]
): { isSelection: boolean; items: TreeItem[] } => {
  const grabbedKey = itemKeyOf(grabbed);
  if (selectedItems.some((item) => itemKeyOf(item) === grabbedKey)) {
    return { isSelection: true, items: rootsOfSelection(selectedItems) };
  }

  return { isSelection: false, items: [grabbed] };
};

const segmentOf = (item: TreeItem): string => item.slug ?? "";

const joinPath = (folder: TreeItem | null, segment: string): string =>
  `${folder?.fullPath === "/" ? "" : (folder?.fullPath ?? "")}/${segment}`;

/**
 * The refusals that apply to rows that change folder; the server runs the same checks under its
 * lock. `parentId` is the folder they land in and `targetFolder` its row: `null` for both is the
 * top level, but a folder whose row is not known (a zoomed folder the page opened on, before its
 * breadcrumbs arrive) has an id and no row. What needs the row (the depth, the allowed types, the
 * path of a conflict) is then left to the server instead of being checked as if it were the top
 * level, which would apply the top level's depth and reserved segments.
 */
const refusalOf = (
  moving: readonly TreeItem[],
  parentId: FolderId | null,
  targetFolder: TreeItem | null,
  state: TreeStoreState,
  rules: DropRules
): DropRefusal | null => {
  const loaded = loadedItemsOf(state);
  const targetKey = folderKeyOf(parentId);
  const isTopLevel = parentId === null;

  const movesIntoItself = moving.some(
    (item) =>
      item.kind === "folder" &&
      !isTopLevel &&
      (String(item.id) === String(parentId) ||
        (targetFolder !== null && isNestedIn(targetFolder, item)))
  );
  if (movesIntoItself) {
    return { kind: "cycle" };
  }

  const allowed = targetFolder?.allowedTypes ?? [];
  if (rules.enforceAllowedTypes && allowed.length > 0) {
    // The pages inside a moved folder land in the target too.
    const refuses = moving.some((item) =>
      item.kind === "page"
        ? !allowed.includes(item.collection)
        : loaded.some(
            (other) =>
              other.kind === "page" &&
              isNestedIn(other, item) &&
              !allowed.includes(other.collection)
          )
    );
    if (refuses) {
      return {
        kind: "type",
        path: targetFolder?.fullPath ?? "",
        types: allowed.map((slug) => rules.typeLabels[slug] ?? slug),
      };
    }
  }

  // A page is one segment below its folder, a folder's deepest loaded row decides for a folder, and
  // a root page shares its folder's depth. What is not loaded is left to the server.
  const targetDepth = isTopLevel ? 0 : (targetFolder?.depth ?? null);
  if (targetDepth !== null) {
    for (const item of moving) {
      if (item.depth === null) {
        continue;
      }
      const ownDepth = item.isFolderRoot ? targetDepth : targetDepth + 1;
      let deepest = ownDepth;
      if (item.kind === "folder") {
        const shift = targetDepth + 1 - item.depth;
        for (const other of loaded) {
          if (other.depth !== null && isNestedIn(other, item)) {
            deepest = Math.max(deepest, other.depth + shift);
          }
        }
      }
      if (deepest > rules.maxDepth) {
        return { depth: deepest, kind: "depth", limit: rules.maxDepth };
      }
    }
  }

  const namedItems = moving.filter((item) => !item.isFolderRoot && segmentOf(item) !== "");
  if (isTopLevel) {
    const reserved = new Set(rules.reservedRootSegments.map((segment) => segment.toLowerCase()));
    for (const item of namedItems) {
      const segment = segmentOf(item);
      if (reserved.has(segment.toLowerCase())) {
        return { dot: false, kind: "reserved", segment };
      }
      if (segment.includes(".")) {
        return { dot: true, kind: "reserved", segment };
      }
    }
  }

  // A moved page conflicts with a published sibling page (a draft is not at that URL yet), a folder
  // conflicts with either, and the moved rows conflict with each other.
  const movingKeys = new Set(moving.map(itemKeyOf));
  const siblings = (state.childrenByFolder[targetKey]?.items ?? []).filter(
    (sibling) => !movingKeys.has(itemKeyOf(sibling)) && !sibling.isFolderRoot
  );
  const claimed = new Map<string, TreeItem>();
  for (const item of namedItems) {
    const segment = segmentOf(item);
    const other =
      siblings.find(
        (sibling) =>
          segmentOf(sibling) === segment &&
          (sibling.kind === "folder" || sibling.status !== "draft")
      ) ?? claimed.get(segment);
    if (other) {
      return {
        kind: "conflict",
        otherTitle: other.kind === "folder" ? null : other.title,
        path:
          isTopLevel || targetFolder !== null ? joinPath(targetFolder, segment) : `.../${segment}`,
        title: item.title,
      };
    }
    claimed.set(segment, item);
  }

  return null;
};

/** The sibling a gap lands after, skipping dragged rows (they leave their place when they move). */
export const anchorBefore = (
  siblings: readonly TreeItem[],
  index: number,
  movingKeys: ReadonlySet<string>
): TreeItem | null => {
  for (let before = index - 1; before >= 0; before -= 1) {
    const sibling = siblings[before] as TreeItem;
    if (!movingKeys.has(itemKeyOf(sibling))) {
      return sibling;
    }
  }

  return null;
};

/** Whether putting the rows in this gap gives the folder the order it already has. */
const leavesOrderUnchanged = (
  moving: readonly TreeItem[],
  siblings: readonly TreeItem[],
  anchor: ItemRef | null
): boolean => {
  const keys = siblings.map(itemKeyOf);
  const movingKeys = new Set(moving.map(itemKeyOf));
  if (![...movingKeys].every((key) => keys.includes(key))) {
    return false;
  }
  const staying = keys.filter((key) => !movingKeys.has(key));
  const insertAt = anchor === null ? 0 : staying.indexOf(itemKeyOf(anchor)) + 1;
  const reordered = [
    ...staying.slice(0, insertAt),
    ...keys.filter((key) => movingKeys.has(key)),
    ...staying.slice(insertAt),
  ];

  return reordered.every((key, index) => key === keys[index]);
};

/** The row to draw the line under for the gap after a folder: below everything open inside it. */
const lastRowOfSubtree = (rows: readonly TreeRowModel[], index: number): string => {
  const folderRow = rows[index] as TreeRowModel;
  let lastKey = folderRow.key;
  for (let next = index + 1; next < rows.length; next += 1) {
    const row = rows[next] as TreeRowModel;
    if (row.level <= folderRow.level) {
      break;
    }
    if (row.type === "item") {
      lastKey = row.key;
    }
  }

  return lastKey;
};

export type GapInput = {
  /**
   * The row the dragged rows land directly after, `null` for the top of the folder. It is never one
   * of the dragged rows: see `anchorAfterRow` and `anchorBefore`.
   */
  anchor: TreeItem | null;
  dragged: readonly TreeItem[];
  /** The folder the rows land in; `null` is the top level. */
  parentId: FolderId | null;
  rules: DropRules;
  state: TreeStoreState;
  /** That folder's own row, `null` for the top level or a folder that is not loaded. */
  targetFolder: TreeItem | null;
};

/**
 * What putting the dragged rows into one gap does: the move request's target, whether it leaves
 * everything where it is, and the reason the gap refuses the rows. Drag and drop and Move mode both
 * ask this, so a gap is refused for the same reason, in the same words, whichever way it is chosen.
 */
export const resolveGap = ({
  anchor,
  dragged,
  parentId,
  rules,
  state,
  targetFolder,
}: GapInput): Omit<DropResolution, "indicator"> => {
  const anchorRef = anchor === null ? null : { collection: anchor.collection, id: anchor.id };
  const target: MoveTarget = anchorRef
    ? { after: anchorRef, toFolder: parentId }
    : { position: "start", toFolder: parentId };

  const targetKey = folderKeyOf(parentId);
  const changing = dragged.filter((moved) => folderKeyOf(moved.parentId) !== targetKey);
  const targetSiblings = state.childrenByFolder[targetKey]?.items ?? [];

  return {
    isNoOp: leavesOrderUnchanged(dragged, targetSiblings, anchorRef),
    refusal: refusalOf(changing, parentId, targetFolder, state, rules),
    target,
    targetFolder,
  };
};

/** The row a gap right after `item` lands after: the row, or the one before it when it is dragged too. */
export const anchorAfterRow = (
  siblings: readonly TreeItem[],
  item: TreeItem,
  movingKeys: ReadonlySet<string>
): TreeItem | null => {
  if (!movingKeys.has(itemKeyOf(item))) {
    return item;
  }
  const index = siblings.findIndex((sibling) => itemKeyOf(sibling) === itemKeyOf(item));

  return anchorBefore(siblings, index, movingKeys);
};

export type DropInput = {
  dragged: readonly TreeItem[];
  /** The row under the pointer, by its row key, and where on it the pointer is. */
  over: { key: string; zone: DropZone };
  rows: readonly TreeRowModel[];
  rules: DropRules;
  state: TreeStoreState;
};

/**
 * Turns the pointer on a row into a move (spec section 6): the gap before a row is after the row's
 * previous sibling, or the start of its folder when it is first; the gap after a row is after that
 * row; inside a folder is its start. A neighbour that is itself dragged is skipped, since the
 * server refuses an `after` that is also moving and the row leaves its place anyway. `null` when
 * the row is not in the loaded tree any more.
 */
export const resolveDrop = ({
  dragged,
  over,
  rows,
  rules,
  state,
}: DropInput): DropResolution | null => {
  const rowIndex = rows.findIndex((row) => row.type === "item" && row.key === over.key);
  const row = rows[rowIndex];
  if (row?.type !== "item") {
    return null;
  }
  const { item, level } = row;
  const movingKeys = new Set(dragged.map(itemKeyOf));
  const siblings = state.childrenByFolder[row.parentKey]?.items ?? [];
  const siblingIndex = siblings.findIndex((sibling) => itemKeyOf(sibling) === over.key);
  const zone = over.zone === "inside" && item.kind !== "folder" ? "after" : over.zone;

  let parentId: FolderId | null;
  let anchor: TreeItem | null = null;
  let indicator: DropIndicator;
  if (zone === "inside") {
    parentId = item.id;
    indicator = { edge: "inside", level, rowKey: over.key };
  } else {
    if (siblingIndex === -1) {
      return null;
    }
    parentId = item.parentId;
    if (zone === "after") {
      anchor = anchorAfterRow(siblings, item, movingKeys);
      indicator = {
        edge: "bottom",
        level,
        rowKey: row.expanded ? lastRowOfSubtree(rows, rowIndex) : over.key,
      };
    } else {
      anchor = anchorBefore(siblings, siblingIndex, movingKeys);
      indicator = { edge: "top", level, rowKey: over.key };
    }
  }

  const targetFolder = zone === "inside" ? item : findLoadedFolder(state, parentId);

  return { ...resolveGap({ anchor, dragged, parentId, rules, state, targetFolder }), indicator };
};

/** The key of a breadcrumb in a drag: `crumb:root` for the top level, else `crumb:<folder id>`. */
export const crumbKeyOf = (folder: Pick<TreeItem, "id"> | null): string =>
  folder === null ? "crumb:root" : `crumb:${folder.id}`;

export type CrumbDropInput = {
  dragged: readonly TreeItem[];
  /** The breadcrumb's folder; `null` is the "Content" crumb, the top level. */
  folder: TreeItem | null;
  rules: DropRules;
  state: TreeStoreState;
};

/**
 * Dropping on a breadcrumb or on the zoom header (spec section 7.3): "inside" that folder, at its
 * start. The folder's row comes with the breadcrumbs, so its depth, types and path are checked like
 * a drop on the folder's own row.
 */
export const resolveCrumbDrop = ({
  dragged,
  folder,
  rules,
  state,
}: CrumbDropInput): DropResolution => ({
  ...resolveGap({
    anchor: null,
    dragged,
    parentId: folder?.id ?? null,
    rules,
    state,
    targetFolder: folder,
  }),
  indicator: { edge: "inside", level: 0, rowKey: crumbKeyOf(folder) },
});
