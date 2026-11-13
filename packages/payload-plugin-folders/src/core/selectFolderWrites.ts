import type { FolderId, ItemRef } from "../types.js";
import { noLocaleKey } from "./locales.js";
import type { PlannedFolder } from "./verifyFolders.js";
import { effectiveSegmentOf } from "./verifyPages.js";
import type { PageFact } from "./verifyPages.js";

export type BlockedFolder = {
  /** The item that holds the path this folder would take; `null` when its parent is held back. */
  collision: ItemRef | null;
  key: string;
  path: string;
};

export type FolderWriteSelection = {
  /** Folders to write, parents before children. */
  writes: PlannedFolder[];
  /** Folders left as they are because a path they would take belongs to another folder or a live page. */
  blocked: Map<string, BlockedFolder>;
};

export const pathClaimKey = (key: string, path: string): string => `${key}\u0000${path}`;

const parentKeyOf = (parent: FolderId | null): string => (parent === null ? "" : `/${parent}`);

/** Live pages by the URL they hold: locale, parent folder and lowercase segment, as the duplicate check reads them. */
const pageClaimKey = (key: string, parent: FolderId | null, segment: string): string =>
  `${key}\u0000${parentKeyOf(parent)}\u0000${segment.toLowerCase()}`;

export const readPageClaims = (
  pages: PageFact[],
  keys: string[],
  defaultLocale: string
): Map<string, ItemRef> => {
  const claims = new Map<string, ItemRef>();
  for (const fact of pages) {
    if (fact.isFolderRoot) {
      continue;
    }
    for (const key of keys.filter((candidate) => fact.liveKeys.includes(candidate))) {
      const segment = effectiveSegmentOf(fact.ownSlug, key, defaultLocale);
      if (segment !== "") {
        claims.set(pageClaimKey(key, fact.folder, segment), {
          collection: fact.collection,
          id: fact.id,
        });
      }
    }
  }

  return claims;
};

/**
 * Picks the folder rows to write. A folder whose planned path in some locale is the stored or
 * planned path of another folder, or the URL of a live page, stays as it is (`fullPath` is unique
 * per locale, so a folder clash would fail the write and take the whole repair with it, and a page
 * clash would put the folder on a URL the page is reached by), and so does everything beneath it,
 * which was planned from that path. Such a clash is a conflict a person settles.
 */
export const selectFolderWrites = ({
  folders,
  foldersSlug,
  keys,
  pageClaims,
}: {
  folders: Map<string, PlannedFolder>;
  foldersSlug: string;
  keys: string[];
  pageClaims: Map<string, ItemRef>;
}): FolderWriteSelection => {
  const all = [...folders.values()];
  const blocked = new Map<string, BlockedFolder>();
  const isWritten = (folder: PlannedFolder): boolean =>
    folder.isDrifted &&
    !folder.isTrashed &&
    folder.plan !== null &&
    !blocked.has(String(folder.record.id));

  for (let changed = true; changed; ) {
    changed = false;
    const claims = new Map<string, PlannedFolder[]>();
    for (const folder of all) {
      for (const key of keys) {
        const path = isWritten(folder) ? folder.plan?.fullPath[key] : folder.record.fullPath[key];
        if (path) {
          const holders = claims.get(pathClaimKey(key, path)) ?? [];
          holders.push(folder);
          claims.set(pathClaimKey(key, path), holders);
        }
      }
    }
    for (const folder of all) {
      const id = String(folder.record.id);
      if (!isWritten(folder)) {
        continue;
      }
      const folderClash = keys
        .map((key) => ({ key, path: folder.plan?.fullPath[key] ?? "" }))
        .find(({ key, path }) =>
          (claims.get(pathClaimKey(key, path)) ?? []).some((other) => other !== folder)
        );
      // Only a path that changes can take a page's URL: a folder already at a page's URL (a clash
      // verify lists) is not made worse by a write that fixes its ancestry.
      const pageClash = keys
        .map((key) => ({
          key,
          page: pageClaims.get(
            pageClaimKey(
              key,
              folder.expectedParent,
              folder.plan?.segments[key] ?? folder.plan?.segments[noLocaleKey] ?? ""
            )
          ),
          path: folder.plan?.fullPath[key] ?? "",
        }))
        .find(
          ({ key, page, path }) =>
            page !== undefined && path !== "" && path !== (folder.record.fullPath[key] ?? "")
        );
      const parentIsBlocked =
        folder.expectedParent !== null && blocked.has(String(folder.expectedParent));
      if (folderClash || pageClash || parentIsBlocked) {
        const collisionFolder = folderClash
          ? (claims
              .get(pathClaimKey(folderClash.key, folderClash.path))
              ?.find((other) => other !== folder) ?? null)
          : null;
        const clash = folderClash ?? pageClash;
        blocked.set(id, {
          collision: collisionFolder
            ? { collection: foldersSlug, id: collisionFolder.record.id }
            : (pageClash?.page ?? null),
          key: clash?.key ?? "",
          path: clash?.path ?? "",
        });
        changed = true;
      }
    }
  }

  // `folders` holds every folder after its parent (the analysis adds a folder once its parent is
  // planned), and the filter keeps that order, which is the order the plans were made in.
  const writes = all.filter((folder) => isWritten(folder));

  return { blocked, writes };
};
