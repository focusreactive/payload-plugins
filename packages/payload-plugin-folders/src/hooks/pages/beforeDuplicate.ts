import type { FieldHook } from "payload";

import { normalizeFolderReference, readFolderRecord } from "../../core/folderRecords.js";
import { MAX_SEGMENT_LENGTH } from "../../core/slugify.js";
import { findSegmentConflict, getPageLocaleKeys } from "../../core/uniqueness.js";
import type { FolderId, ResolvedOptions } from "../../types.js";

/** The copy of a root page is an ordinary page: the folder keeps its one root page. */
export const resetIsFolderRootOnDuplicate: FieldHook = () => false;

/** `null`, not undefined: undefined keeps the original's key, and the create hook then assigns a fresh one. */
export const resetOrderKeyOnDuplicate: FieldHook = () => null;

export const resetStructureRevisionOnDuplicate: FieldHook = () => 0;

const maxCopyAttempts = 1000;

/** Attempt 0 is the segment itself, 1 is `-copy`, then `-copy-2`, `-copy-3`. */
export const withCopySuffix = (segment: string, attempt: number): string => {
  if (attempt === 0) {
    return segment;
  }
  const suffix = attempt === 1 ? "-copy" : `-copy-${attempt}`;

  return `${segment.slice(0, MAX_SEGMENT_LENGTH - suffix.length)}${suffix}`;
};

/**
 * Where the duplicate core (`core/duplicate.ts`) puts a copy: the folder it goes to, which the copy's
 * `folder` field takes instead of the original's. Set on the request context of one duplicate call;
 * a stock Duplicate button never sets it and keeps the original's folder.
 */
export type DuplicateTarget = {
  folder: FolderId | null;
  /** The copy goes to the folder of the original. */
  isBesideSource: boolean;
};

const duplicateTargetOf = (req: { context?: Record<string, unknown> }): DuplicateTarget | null => {
  const target = req.context?.foldersDuplicate;

  return target && typeof target === "object" ? (target as DuplicateTarget) : null;
};

export const folderBeforeDuplicate: FieldHook = ({ req, value }) => {
  const target = duplicateTargetOf(req);

  return target ? target.folder : value;
};

/**
 * The copy takes the original's segment with `-copy`, then `-copy-2`, `-copy-3`, until no page or
 * folder in the same folder has it in any locale. Payload runs a localized field's hook once per
 * locale without saying which, so the suffix is picked to be free everywhere. A locale without a
 * value gets none (`undefined`), so the duplicate never creates a locale row the original lacks.
 * Drafts and published pages both count: the copy is a new draft, and a segment already taken by
 * a draft would only turn into a conflict at publish.
 *
 * A duplicate that names a target folder (`core/duplicate.ts`) checks that folder, and into another
 * folder first tries the original's own segment.
 */
export const buildSegmentBeforeDuplicate =
  (options: ResolvedOptions): FieldHook =>
  async ({ data, req, value }) => {
    if (typeof value !== "string" || value === "") {
      return undefined;
    }
    const target = duplicateTargetOf(req);
    const reference = normalizeFolderReference(target ? target.folder : data?.folder);
    const folder =
      reference.id === null || reference.invalid
        ? null
        : await readFolderRecord(req, options, reference.id);

    // Beside the original the copy always says so, even when the original is a root page and its
    // segment would be free: the copy would clash as soon as the original stops being the root.
    const isInOtherFolder = target !== null && !target.isBesideSource;
    for (let attempt = isInOtherFolder ? 0 : 1; attempt <= maxCopyAttempts; attempt += 1) {
      const candidate = withCopySuffix(value, attempt);
      let isFree = true;
      for (const locale of getPageLocaleKeys(req.payload)) {
        const conflict = await findSegmentConflict({
          folder,
          locale,
          options,
          publishedOnly: false,
          req,
          segment: candidate,
          self: null,
        });
        if (conflict) {
          isFree = false;
          break;
        }
      }
      if (isFree) {
        return candidate;
      }
    }

    return undefined;
  };
