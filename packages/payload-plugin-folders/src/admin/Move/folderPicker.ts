import type { FolderId, TreeItem } from "../../types.js";
import { rootKey } from "../store.js";
import type { FolderKey, TreeStoreState } from "../store.js";

/** Why a folder cannot take the selection, known from the rows on screen. */
export type TargetRefusal = { kind: "cycle" } | { kind: "type"; path: string; types: string[] };

/**
 * Whether the selection may go into `target` (`null` is the top level, which takes anything). The
 * checks use only loaded rows; the server checks everything under its lock, and the live preview
 * line shows what only it can know (a depth cap, a path that is taken).
 */
export const refusalOf = (
  items: readonly TreeItem[],
  target: TreeItem | null,
  {
    enforceAllowedTypes,
    typeLabels,
  }: { enforceAllowedTypes: boolean; typeLabels: Readonly<Record<string, string>> }
): TargetRefusal | null => {
  if (target === null) {
    return null;
  }
  const movesIntoItself = items.some(
    (item) =>
      item.kind === "folder" &&
      (String(item.id) === String(target.id) || (target.ancestorIds ?? "").includes(`/${item.id}/`))
  );
  if (movesIntoItself) {
    return { kind: "cycle" };
  }
  const allowed = target.allowedTypes ?? [];
  if (enforceAllowedTypes && allowed.length > 0) {
    // A page already in the folder is a reorder, which the folder's types do not touch.
    const refused = items.some(
      (item) =>
        item.kind === "page" &&
        !allowed.includes(item.collection) &&
        String(item.parentId) !== String(target.id)
    );
    if (refused) {
      return {
        kind: "type",
        path: target.fullPath,
        types: allowed.map((slug) => typeLabels[slug] ?? slug),
      };
    }
  }

  return null;
};

export type PickerRow =
  | {
      expandable: boolean;
      expanded: boolean;
      id: FolderId | null;
      item: TreeItem | null;
      key: string;
      kind: "folder";
      level: number;
      parentKey: FolderKey;
      title: string;
    }
  | { key: string; kind: "loading"; level: number }
  | { key: string; kind: "load-more"; level: number; loading: boolean; parentKey: FolderKey }
  | { key: string; kind: "empty"; level: number }
  | { key: string; kind: "error"; level: number; message: string; parentKey: FolderKey };

/**
 * The rows of the folder picker: "Content (top level)", then the folders of every folder the
 * picker opened, read from the shared store. Pages are left out. The picker keeps its own set of
 * open folders, so opening one here does not open it in the tree behind the dialog.
 */
export const pickerRowsOf = (
  state: TreeStoreState,
  expanded: ReadonlySet<FolderKey>,
  rootTitle: string
): PickerRow[] => {
  const rows: PickerRow[] = [
    {
      expandable: false,
      expanded: true,
      id: null,
      item: null,
      key: rootKey,
      kind: "folder",
      level: 0,
      parentKey: rootKey,
      title: rootTitle,
    },
  ];

  const visit = (parentKey: FolderKey, level: number, path: ReadonlySet<FolderKey>): void => {
    const entry = state.childrenByFolder[parentKey];
    if (!entry || entry.phase === "loading") {
      rows.push({ key: `loading:${parentKey}`, kind: "loading", level });

      return;
    }
    if (entry.phase === "error" && entry.items.length === 0) {
      rows.push({
        key: `error:${parentKey}`,
        kind: "error",
        level,
        message: entry.error ?? "",
        parentKey,
      });

      return;
    }
    const folders = entry.items.filter((item) => item.kind === "folder");
    for (const folder of folders) {
      const folderKey = String(folder.id);
      const isOpen = expanded.has(folderKey) && !path.has(folderKey);
      rows.push({
        // A folder with no children has nothing to open.
        expandable: (folder.childCount ?? 1) > 0,
        expanded: isOpen,
        id: folder.id,
        item: folder,
        key: folderKey,
        kind: "folder",
        level,
        parentKey,
        title: folder.title,
      });
      if (isOpen) {
        visit(folderKey, level + 1, new Set([...path, folderKey]));
      }
    }
    if (folders.length === 0 && !entry.hasMore) {
      rows.push({ key: `empty:${parentKey}`, kind: "empty", level });
    }
    if (entry.hasMore) {
      rows.push({
        key: `load-more:${parentKey}`,
        kind: "load-more",
        level,
        loading: entry.loadingMore || entry.refreshing,
        parentKey,
      });
    }
  };

  visit(rootKey, 1, new Set());

  return rows;
};
