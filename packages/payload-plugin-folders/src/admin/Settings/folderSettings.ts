import type { FolderId } from "../../types.js";

/** What the folder settings drawer edits. */
export type FolderSettingsValues = {
  /** Empty means every type. */
  allowedTypes: readonly string[];
  /** Empty means no default. */
  defaultType: string;
  lockSubfolderTypes: boolean;
  name: string;
  parentId: FolderId | null;
  /** The segment the form shows: the folder's own value in the admin locale. */
  segment: string;
};

const sameTypes = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((type) => right.includes(type));

/** The default type that survives the list: one that left the list reads as no default. */
export const effectiveDefaultType = (
  defaultType: string,
  allowedTypes: readonly string[],
  allTypes: readonly string[]
): string =>
  (allowedTypes.length > 0 ? allowedTypes : allTypes).includes(defaultType) ? defaultType : "";

export type FolderSavePlan = {
  /** Locking (or changing the locked types of) subfolders: the editor confirms the count first. */
  locksSubfolders: boolean;
  /** The folder's own fields, sent in one PATCH; `{}` when only the parent changed. */
  patch: Record<string, unknown>;
  /** The segment changed: preview and confirm the URL change before the PATCH. */
  renames: boolean;
  /** The parent changed: a move through the move endpoint, after the PATCH. */
  toParent: { id: FolderId | null } | null;
};

/**
 * What saving the folder settings does (spec section 7.8): the changed fields go in one PATCH; a
 * new segment is previewed and confirmed first, a new parent is a move afterwards, and locking
 * subfolder types is confirmed with the number of subfolders it rewrites. A folder under a lock
 * never sends its types, which the server would refuse.
 */
export const planFolderSettingsSave = ({
  edited,
  isLocked,
  stored,
}: {
  edited: FolderSettingsValues;
  /** The folder's types come from a lock above it: they are not editable. */
  isLocked: boolean;
  stored: FolderSettingsValues;
}): FolderSavePlan => {
  const patch: Record<string, unknown> = {};
  if (stored.name !== edited.name) {
    patch.name = edited.name;
  }
  const renames = stored.segment !== edited.segment;
  if (renames) {
    patch.slug = edited.segment;
  }
  let locksSubfolders = false;
  if (!isLocked) {
    const typesChanged = !sameTypes(stored.allowedTypes, edited.allowedTypes);
    if (typesChanged) {
      patch.allowedTypes = [...edited.allowedTypes];
    }
    if (stored.defaultType !== edited.defaultType) {
      patch.defaultType = edited.defaultType === "" ? null : edited.defaultType;
    }
    if (stored.lockSubfolderTypes !== edited.lockSubfolderTypes) {
      patch.lockSubfolderTypes = edited.lockSubfolderTypes;
    }
    locksSubfolders = edited.lockSubfolderTypes && (!stored.lockSubfolderTypes || typesChanged);
  }

  return {
    locksSubfolders,
    patch,
    renames,
    toParent: String(stored.parentId) === String(edited.parentId) ? null : { id: edited.parentId },
  };
};
