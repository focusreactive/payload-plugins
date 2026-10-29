import { useEffect, useMemo } from "react";

import { rootKey } from "../store.js";
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

/** A loaded folder whose last refresh failed: its rows are shown, and may be out of date. */
export type StaleRowModel = {
  key: string;
  level: number;
  message: string;
  parentKey: FolderKey;
  type: "stale";
};

export type TreeRowModel =
  | ErrorRowModel
  | StaleRowModel
  | (ItemRowModel & { type: "item" })
  | LoadingRowModel
  | LoadMoreRowModel;

/**
 * The visible rows, top to bottom: each folder's loaded rows in tree order, an opened folder's
 * rows right under it, and a "Load more" row at the end of a folder that has more.
 */
export const flattenTree = (state: TreeStoreState): TreeRowModel[] => {
  const rows: TreeRowModel[] = [];
  const expanded = new Set(state.expanded);

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
      const loadedRows =
        folderKey === null ? 0 : (state.childrenByFolder[folderKey]?.items.length ?? 0);
      const expandable = folderKey !== null && ((item.childCount ?? 1) > 0 || loadedRows > 0);
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
      if (folderKey !== null && isExpanded && expandable && !path.has(folderKey)) {
        visit(folderKey, level + 1, new Set([...path, folderKey]));
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
        loading: entry.loadingMore,
        parentKey,
        type: "load-more",
      });
    }
  };

  visit(rootKey, 0, new Set());

  return rows;
};

/** The visible rows of the shared tree, reading the top level as soon as there is a store. */
export const useTreeData = (store: TreeStore): { rows: TreeRowModel[]; state: TreeStoreState } => {
  const state = useTreeStoreState(store);
  const rows = useMemo(() => flattenTree(state), [state]);
  const hasTopLevel = state.childrenByFolder[rootKey] !== undefined;
  useEffect(() => {
    if (!hasTopLevel) {
      void store.loadChildren(null);
    }
  }, [hasTopLevel, store]);

  return { rows, state };
};
