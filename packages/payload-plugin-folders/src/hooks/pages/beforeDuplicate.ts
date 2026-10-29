import type { FieldHook } from "payload";

import { normalizeFolderReference, readFolderRecord } from "../../core/folderRecords.js";
import { MAX_SEGMENT_LENGTH } from "../../core/slugify.js";
import { findSegmentConflict, getPageLocaleKeys } from "../../core/uniqueness.js";
import type { ResolvedOptions } from "../../types.js";

/** The copy of a root page is an ordinary page: the folder keeps its one root page. */
export const resetIsFolderRootOnDuplicate: FieldHook = () => false;

/** `null`, not undefined: undefined keeps the original's key, and the create hook then assigns a fresh one. */
export const resetOrderKeyOnDuplicate: FieldHook = () => null;

export const resetStructureRevisionOnDuplicate: FieldHook = () => 0;

const maxCopyAttempts = 1000;

const withSuffix = (segment: string, attempt: number): string => {
  const suffix = attempt === 1 ? "-copy" : `-copy-${attempt}`;

  return `${segment.slice(0, MAX_SEGMENT_LENGTH - suffix.length)}${suffix}`;
};

/**
 * The copy takes the original's segment with `-copy`, then `-copy-2`, `-copy-3`, until no page or
 * folder in the same folder has it in any locale. Payload runs a localized field's hook once per
 * locale without saying which, so the suffix is picked to be free everywhere. A locale without a
 * value gets none (`undefined`), so the duplicate never creates a locale row the original lacks.
 * Drafts and published pages both count: the copy is a new draft, and a segment already taken by
 * a draft would only turn into a conflict at publish.
 */
export const buildSegmentBeforeDuplicate =
  (options: ResolvedOptions): FieldHook =>
  async ({ data, req, value }) => {
    if (typeof value !== "string" || value === "") {
      return undefined;
    }
    const reference = normalizeFolderReference(data?.folder);
    const folder =
      reference.id === null || reference.invalid
        ? null
        : await readFolderRecord(req, options, reference.id);

    for (let attempt = 1; attempt <= maxCopyAttempts; attempt += 1) {
      const candidate = withSuffix(value, attempt);
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
