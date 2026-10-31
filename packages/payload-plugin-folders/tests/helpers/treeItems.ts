import type { ChildrenEntry, TreeStoreState } from "../../src/admin/store.js";
import { rootKey } from "../../src/admin/store.js";
import type { TreeItem } from "../../src/types.js";

export const fullAccess = { delete: true, publish: true, update: true };

type Overrides = Partial<TreeItem>;

/** A folder row as the children endpoint answers it; synthetic. */
export const folderRow = (
  id: number,
  title: string,
  parentId: number | null = null,
  overrides: Overrides = {}
): TreeItem => ({
  access: fullAccess,
  ancestorIds: parentId === null ? "/" : `/${parentId}/`,
  childCount: 0,
  collection: "folders",
  depth: parentId === null ? 0 : 1,
  fullPath: `/${title.toLowerCase()}`,
  hasRootPage: false,
  id,
  kind: "folder",
  orderKey: `f${id}`,
  parentId,
  slug: title.toLowerCase(),
  slugIsFallback: false,
  structureRevision: 0,
  title,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

/** A page row as the children endpoint answers it; synthetic. */
export const pageRow = (
  id: number,
  title: string,
  parentId: number | null = null,
  overrides: Overrides = {}
): TreeItem => ({
  access: fullAccess,
  ancestorIds: parentId === null ? "/" : `/${parentId}/`,
  collection: "pages",
  depth: parentId === null ? 1 : 2,
  fullPath: `/${title.toLowerCase()}`,
  id,
  kind: "page",
  orderKey: `p${id}`,
  parentId,
  slug: title.toLowerCase(),
  slugIsFallback: false,
  status: "published",
  structureRevision: 0,
  title,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

export const loadedEntry = (
  items: TreeItem[],
  overrides: Partial<ChildrenEntry> = {}
): ChildrenEntry => ({
  error: null,
  hasMore: false,
  items,
  loadingMore: false,
  nextCursor: null,
  phase: "loaded",
  refreshing: false,
  revision: 1,
  stale: false,
  ...overrides,
});

/** A store state with these folders loaded, `root` being the top level. */
export const stateOf = (
  loaded: Record<string, TreeItem[]>,
  expanded: string[] = []
): TreeStoreState => ({
  childrenByFolder: Object.fromEntries(
    Object.entries(loaded).map(([key, items]) => [key, loadedEntry(items)])
  ),
  expanded,
  revision: 1,
});

export { rootKey };
