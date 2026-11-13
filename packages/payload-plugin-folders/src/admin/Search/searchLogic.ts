import type { TreeItem, TreeStatus } from "../../types.js";
import { folderKeyOf } from "../store.js";
import type { ItemRowModel } from "../Tree/useTreeData.js";
import { itemKey } from "../../core/itemKey.js";

/** The hits a search asks for: more than a person reads down a list, fewer than the endpoint's cap. */
export const searchResultLimit = 100;

/** How long the box waits after the last keystroke before it searches. */
export const searchDebounceMs = 300;

/** The status filter's choices, as spec section 7.2 lists them. */
export type StatusFilter = "changed" | "draft" | "published";

export const statusFilterChoices: readonly StatusFilter[] = ["draft", "published", "changed"];

export type SearchFilters = {
  statuses: readonly StatusFilter[];
  /** Collection slugs: page collections and the folders' own. */
  types: readonly string[];
};

export const noFilters: SearchFilters = { statuses: [], types: [] };

export const activeFilterCount = (filters: SearchFilters): number =>
  filters.statuses.length + filters.types.length;

/**
 * The statuses the endpoint is asked for. A collection without drafts has pages that are always
 * `live`, which is what "Published" means there, so the one choice covers both.
 */
export const apiStatusesOf = (statuses: readonly StatusFilter[]): TreeStatus[] | undefined =>
  statuses.length === 0
    ? undefined
    : statuses.flatMap((status): TreeStatus[] =>
        status === "published" ? ["published", "live"] : [status]
      );

export const toggled = <Value>(values: readonly Value[], value: Value): Value[] =>
  values.includes(value) ? values.filter((other) => other !== value) : [...values, value];

/**
 * The names above a hit, top first, starting at the collection's own title (`Content`). The
 * endpoint names every folder in the hit's `ancestorIds` that the user can read; one it left out
 * is skipped, as in the endpoint that lists a hit's ancestors.
 */
export const searchPathOf = (
  item: Pick<TreeItem, "ancestorIds">,
  folders: Readonly<Record<string, string>>,
  rootTitle: string
): string[] => [
  rootTitle,
  ...(item.ancestorIds ?? "")
    .split("/")
    .filter((id) => id !== "")
    .flatMap((id) => (folders[id] === undefined || folders[id] === "" ? [] : [folders[id]])),
];

/**
 * The hits as rows of the same grid the tree uses, flat: level 0, nothing to open, each one
 * carrying its path for the row to show.
 */
export const searchRowsOf = (
  items: readonly TreeItem[],
  folders: Readonly<Record<string, string>>,
  rootTitle: string
): Array<ItemRowModel & { type: "item" }> =>
  items.map((item, index) => ({
    expandable: false,
    expanded: false,
    item,
    key: itemKey(item),
    level: 0,
    parentKey: folderKeyOf(item.parentId),
    posInSet: index + 1,
    searchPath: searchPathOf(item, folders, rootTitle),
    setSize: items.length,
    type: "item" as const,
  }));

/**
 * The folders to open to show a hit in the tree, top first: its `ancestorIds` below the zoomed
 * folder. `null` when the hit is outside the zoomed folder, so the tree has to zoom out first.
 */
export const foldersToOpenFor = (
  item: Pick<TreeItem, "ancestorIds">,
  zoomFolderId: number | string | null
): string[] | null => {
  const chain = (item.ancestorIds ?? "").split("/").filter((id) => id !== "");
  if (zoomFolderId === null) {
    return chain;
  }
  const at = chain.indexOf(String(zoomFolderId));

  return at === -1 ? null : chain.slice(at + 1);
};
