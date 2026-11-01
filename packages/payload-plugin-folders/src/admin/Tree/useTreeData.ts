import { useEffect, useMemo } from "react";

import { rootKey, viewRootKeyOf } from "../store.js";
import type { FolderKey, TreeStore, TreeStoreState } from "../store.js";
import { useTreeStoreState } from "../useTreeStore.js";
import type { TreeItem } from "../../types.js";

export type ItemRowModel = {
  /** Folders only: whether the user opened it. */
  expanded: boolean;
  /** Folders only: whether there is anything to open. */
  expandable: boolean;
  item: TreeItem;
  key: string;
  /** Nesting depth in the tree on screen, from 0. Not `item.depth`, which can be unknown. */
  level: number;
  parentKey: FolderKey;
};

export type LoadingRowModel = { key: string; level: number; type: "loading" };

export type LoadMoreRowModel = {
  error: string | null;
  key: string;
  level: number;
  loading: boolean;
  parentKey: FolderKey;
  type: "load-more";
};

export type ErrorRowModel = {
  key: string;
  level: number;
  message: string;
  parentKey: FolderKey;
  type: "error";
};

/**
 * A folder that is open and has nothing in it (spec section 7.2): one muted row with links to
 * create something. The zoomed folder with nothing in it, or a top level with nothing in it, is
 * shown by the view as a panel instead, so this row never stands for the view's own root.
 */
export type EmptyRowModel = {
  /** The folder's own row, whose Create links these are. */
  folder: TreeItem;
  key: string;
  level: number;
  parentKey: FolderKey;
  type: "empty";
};

/** A loaded folder whose last refresh failed: its rows are shown, and may be out of date. */
export type StaleRowModel = {
  key: string;
  level: number;
  message: string;
  parentKey: FolderKey;
  type: "stale";
};

export type TreeRowModel =
  | EmptyRowModel
  | ErrorRowModel
  | StaleRowModel
  | (ItemRowModel & { type: "item" })
  | LoadingRowModel
  | LoadMoreRowModel;

/**
 * The visible rows, top to bottom, starting at the zoomed folder (or the top level): each folder's
 * loaded rows in tree order, an opened folder's rows right under it, and a "Load more" row at the
 * end of a folder that has more. Every folder can be opened, an empty one included, so that its
 * empty state can be seen and acted on.
 */
export const flattenTree = (state: TreeStoreState): TreeRowModel[] => {
  const rows: TreeRowModel[] = [];
  const expanded = new Set(state.expanded);
  const viewRoot = viewRootKeyOf(state);

  const visit = (parentKey: FolderKey, level: number, path: ReadonlySet<FolderKey>): void => {
    const entry = state.childrenByFolder[parentKey];
    if (!entry || entry.phase === "loading") {
      rows.push({ key: `loading:${parentKey}`, level, type: "loading" });

      return;
    }
    if (entry.phase === "error" && entry.items.length === 0) {
      rows.push({
        key: `error:${parentKey}`,
        level,
        message: entry.error ?? "",
        parentKey,
        type: "error",
      });

      return;
    }
    for (const item of entry.items) {
      const folderKey = item.kind === "folder" ? String(item.id) : null;
      const isExpanded = folderKey !== null && expanded.has(folderKey);
      const expandable = folderKey !== null;
      rows.push({
        expanded: isExpanded && expandable,
        expandable,
        item,
        key: `${item.collection}:${item.id}`,
        level,
        parentKey,
        type: "item",
      });
      // A folder that listed itself among its own ancestors would never end.
      if (folderKey !== null && isExpanded && !path.has(folderKey)) {
        visit(folderKey, level + 1, new Set([...path, folderKey]));
        const opened = state.childrenByFolder[folderKey];
        if (opened?.phase === "loaded" && opened.items.length === 0 && !opened.hasMore) {
          rows.push({
            folder: item,
            key: `empty:${folderKey}`,
            level: level + 1,
            parentKey: folderKey,
            type: "empty",
          });
        }
      }
    }
    if (entry.stale && entry.error !== null) {
      rows.push({
        key: `stale:${parentKey}`,
        level,
        message: entry.error,
        parentKey,
        type: "stale",
      });
    }
    if (entry.hasMore) {
      rows.push({
        error: entry.error,
        key: `load-more:${parentKey}`,
        level,
        // Busy while it loads, and while a refresh is replacing the rows it would append to.
        loading: entry.loadingMore || entry.refreshing,
        parentKey,
        type: "load-more",
      });
    }
  };

  visit(viewRoot, 0, new Set([viewRoot]));

  return rows;
};

/** The visible rows of the shared tree, reading the top level as soon as there is a store. */
export const useTreeData = (store: TreeStore): { rows: TreeRowModel[]; state: TreeStoreState } => {
  const state = useTreeStoreState(store);
  const rows = useMemo(() => flattenTree(state), [state]);
  const viewRoot = viewRootKeyOf(state);
  const hasViewRoot = state.childrenByFolder[viewRoot] !== undefined;
  useEffect(() => {
    if (!hasViewRoot) {
      void store.loadChildren(viewRoot === rootKey ? null : viewRoot);
    }
  }, [hasViewRoot, store, viewRoot]);

  return { rows, state };
};
