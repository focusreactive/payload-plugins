import type { FolderId, TreeItem } from "../../types.js";
import type { MovePreview } from "../api.js";
import { findLoadedFolder, folderKeyOf, itemKeyOf } from "../store.js";
import type { TreeStoreState } from "../store.js";

/**
 * How "Set as root page" saves. A page with a newer draft (or none published yet) is edited as a
 * draft, like any content field (spec section 3.3): a plain save would publish that draft, and the
 * URL changes when someone publishes. A published page, or one in a collection without drafts, is
 * saved live: its URL changes now, so the editor confirms first.
 */
export type RootUpdateMode = "draft" | "live";

export const rootUpdateModeOf = (item: TreeItem): RootUpdateMode =>
  item.status === "draft" || item.status === "changed" ? "draft" : "live";

/**
 * The body of the page update. A published page of a collection with drafts must say it stays
 * published, or the save would count as a draft; a collection without drafts has no status field.
 */
export const rootPageBodyOf = (item: TreeItem): Record<string, boolean | string> => {
  if (rootUpdateModeOf(item) === "draft") {
    return { _status: "draft", isFolderRoot: true };
  }

  return item.status === "published"
    ? { _status: "published", isFolderRoot: true }
    : { isFolderRoot: true };
};

/** The root page a folder already has: the page when it is loaded, `unknown` when only the folder says so. */
export type ExistingRoot = { title: string } | "unknown" | null;

/**
 * Whether the folder the page sits in already has a root page, from the rows on screen: another
 * page of that folder that is the root, else the folder's own `hasRootPage` flag. The server
 * checks again when the save goes live (spec section 4).
 */
export const existingRootOf = (item: TreeItem, state: TreeStoreState): ExistingRoot => {
  const siblings = state.childrenByFolder[folderKeyOf(item.parentId)]?.items ?? [];
  const root = siblings.find(
    (sibling) =>
      sibling.kind === "page" &&
      sibling.isFolderRoot === true &&
      itemKeyOf(sibling) !== itemKeyOf(item)
  );
  if (root) {
    return { title: root.title };
  }
  if (item.parentId === null) {
    return null;
  }
  return findLoadedFolder(state, item.parentId)?.hasRootPage === true ? "unknown" : null;
};

/**
 * What the confirmation shows for a live root change: the page's URL becomes its folder's path.
 * Only the page the editor sees is named; the server writes the redirect rows and counts every
 * language itself, so none is promised here.
 */
export const rootChangePreviewOf = (
  item: TreeItem,
  folderPath: string,
  folderId: FolderId | null
): MovePreview => ({
  blocked: [],
  droppedItems: [],
  foldersRewritten: 0,
  mirrorRowsToWrite: 0,
  ok: true,
  orderKeys: {},
  redirectRowsToWrite: 0,
  samples: [
    { collection: item.collection, from: item.fullPath, id: item.id, locale: null, to: folderPath },
  ],
  targetFolderId: folderId,
  urlChanges: { draftOnly: 0, published: 1, publishedAcrossLocales: 1 },
  warnings: [],
});
