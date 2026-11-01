import type { TreeItem } from "../../types.js";
import { itemKeyOf } from "../store.js";
import type { ItemRowModel, TreeRowModel } from "../Tree/useTreeData.js";

/** What a key press says, for the tree to decide what it means (spec section 7.6). */
export type KeyFacts = {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
};

export type TreeKeyAction =
  | "activate"
  | "collapseOrParent"
  | "cut"
  | "delete"
  | "duplicate"
  | "escape"
  | "expandOrFirstChild"
  | "extendDown"
  | "extendUp"
  | "focusFirst"
  | "focusLast"
  | "focusNext"
  | "focusPrevious"
  | "focusSearch"
  | "moveDown"
  | "moveIn"
  | "moveOut"
  | "moveUp"
  | "paste"
  | "selectAll"
  | "toggleSelection"
  | "undo";

/**
 * The table of spec section 7.6, as a function of the key and its modifiers. Cmd on a Mac and Ctrl
 * elsewhere are the same key here ("primary"); a press with any modifier the table does not name
 * means nothing, so browser and system shortcuts keep working. `/` ignores Shift because some
 * keyboard layouts need it to type a slash. Alt+Enter, F2 and the menu keys are the row's own.
 */
export const treeKeyActionOf = ({
  altKey,
  ctrlKey,
  key,
  metaKey,
  shiftKey,
}: KeyFacts): TreeKeyAction | null => {
  const isPrimary = ctrlKey || metaKey;
  if (isPrimary) {
    if (altKey || shiftKey || (ctrlKey && metaKey)) {
      return null;
    }
    const byLetter: Record<string, TreeKeyAction> = {
      a: "selectAll",
      d: "duplicate",
      v: "paste",
      x: "cut",
      z: "undo",
    };

    return byLetter[key.toLowerCase()] ?? null;
  }
  if (key === "/") {
    return altKey ? null : "focusSearch";
  }
  if (altKey) {
    if (shiftKey) {
      return null;
    }
    const byArrow: Record<string, TreeKeyAction> = {
      ArrowDown: "moveDown",
      ArrowLeft: "moveOut",
      ArrowRight: "moveIn",
      ArrowUp: "moveUp",
    };

    return byArrow[key] ?? null;
  }
  if (shiftKey) {
    return key === "ArrowUp" ? "extendUp" : key === "ArrowDown" ? "extendDown" : null;
  }
  const plain: Record<string, TreeKeyAction> = {
    ArrowDown: "focusNext",
    ArrowLeft: "collapseOrParent",
    ArrowRight: "expandOrFirstChild",
    ArrowUp: "focusPrevious",
    Backspace: "delete",
    Delete: "delete",
    End: "focusLast",
    Enter: "activate",
    Escape: "escape",
    Home: "focusFirst",
    " ": "toggleSelection",
  };

  return plain[key] ?? null;
};

export const itemRowsOf = (rows: readonly TreeRowModel[]): ItemRowModel[] =>
  rows.flatMap((row): ItemRowModel[] => (row.type === "item" ? [row] : []));

/** What an arrow key, Home or End does to the rows. */
export type Navigation =
  | { id: TreeItem["id"]; type: "collapse" | "expand" }
  | { key: string; type: "focus" }
  | null;

/**
 * Up and Down step to the neighbouring row and stop at the ends; Home and End go to the first and
 * last. Right opens a closed folder and, on an open one, goes to its first row; Left closes an open
 * folder and, on anything else, goes to the folder it is in.
 */
export const navigationFor = (
  action: TreeKeyAction,
  rows: readonly ItemRowModel[],
  activeKey: string | null
): Navigation => {
  const index = rows.findIndex((row) => row.key === activeKey);
  const row = rows[index];
  const focusAt = (at: number): Navigation => {
    const target = rows[Math.min(Math.max(at, 0), rows.length - 1)];

    return target === undefined ? null : { key: target.key, type: "focus" };
  };

  switch (action) {
    case "focusFirst": {
      return focusAt(0);
    }
    case "focusLast": {
      return focusAt(rows.length - 1);
    }
    case "focusNext": {
      return focusAt(index === -1 ? 0 : index + 1);
    }
    case "focusPrevious": {
      return focusAt(index === -1 ? 0 : index - 1);
    }
    case "expandOrFirstChild": {
      if (row === undefined || !row.expandable) {
        return null;
      }
      if (!row.expanded) {
        return { id: row.item.id, type: "expand" };
      }
      const next = rows[index + 1];

      return next !== undefined && next.parentKey === String(row.item.id)
        ? { key: next.key, type: "focus" }
        : null;
    }
    case "collapseOrParent": {
      if (row === undefined) {
        return null;
      }
      if (row.expandable && row.expanded) {
        return { id: row.item.id, type: "collapse" };
      }
      const parent = rows.find((candidate) => String(candidate.item.id) === row.parentKey);

      return parent !== undefined && parent.item.kind === "folder"
        ? { key: parent.key, type: "focus" }
        : null;
    }
    default: {
      return null;
    }
  }
};

/**
 * The row that is in the tab order: the one that last had the focus when it is still there, else
 * the first row.
 */
export const tabStopKeyOf = (
  rows: readonly ItemRowModel[],
  activeKey: string | null
): string | null => rows.find((row) => row.key === activeKey)?.key ?? rows[0]?.key ?? null;

/**
 * Where the focus goes when its row is gone (deleted, moved out of view): the row that now stands
 * at the same place, else the last row. `previousKeys` are the rows as they were, so the place is known.
 */
export const neighbourKeyOf = (
  rows: readonly ItemRowModel[],
  previousKeys: readonly string[],
  lostKey: string
): string | null => {
  const wasAt = previousKeys.indexOf(lostKey);
  if (rows.length === 0) {
    return null;
  }

  return (rows[Math.min(wasAt === -1 ? 0 : wasAt, rows.length - 1)] as ItemRowModel).key;
};

/** The key of the row a DOM row element stands for. */
export const rowKeyOfAttributes = (collection: string | null, id: string | null): string | null =>
  collection === null || id === null ? null : itemKeyOf({ collection, id });
