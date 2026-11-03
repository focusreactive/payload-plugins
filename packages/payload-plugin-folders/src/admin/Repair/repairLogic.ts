import type { RepairResult } from "../../core/repair.js";
import type { VerifyResult } from "../../core/verify.js";
import type { Translate } from "../compat.js";
import { describeIssue } from "./issueLines.js";

/** Lines of one list the dialog writes out; the rest is "and N more". */
export const repairListLimit = 50;

export type RepairList = {
  /** One sentence per issue in the admin's language, the first `repairListLimit`. */
  lines: string[];
  /** How many issues the lines leave out: those past the limit, and those the server did not list. */
  more: number;
  /** Every issue of this kind of list, counted by the server whatever it listed. */
  total: number;
};

export type RepairListing = {
  conflicts: RepairList;
  fixed: RepairList;
  /** Nothing to fix and nothing left for a person: the tree already follows its rules. */
  isClean: boolean;
  /** Rebuilding would change something. */
  isRepairable: boolean;
  /**
   * How many rows the rebuild writes when that is more than the site's sync limit, so the dialog can
   * warn that page saves wait for it; `null` for an ordinary one.
   */
  largeWrites: number | null;
  /** Full URLs that would change, from the folders and the pages beneath them. */
  urlChanges: number;
};

const listOf = (list: RepairResult["fixed"], translate: Translate): RepairList => {
  const lines = list.issues
    .slice(0, repairListLimit)
    .map((issue) => describeIssue(issue, translate));

  return { lines, more: Math.max(0, list.total - lines.length), total: list.total };
};

/**
 * What the Rebuild dialog shows of a dry run: what repair would fix and what it leaves for a
 * person, each with its full count even where the server listed only a part (`issues` holds at
 * most 100 per kind, `total` is complete).
 */
export const repairListingOf = (result: RepairResult, translate: Translate): RepairListing => {
  const fixed = listOf(result.fixed, translate);
  const conflicts = listOf(result.conflicts, translate);

  return {
    conflicts,
    fixed,
    isClean: fixed.total === 0 && conflicts.total === 0,
    isRepairable: fixed.total > 0,
    largeWrites:
      result.isLarge && fixed.total > 0
        ? Object.values(result.writes).reduce((sum, count) => sum + count, 0)
        : null,
    urlChanges: result.changes.total,
  };
};

/**
 * Whether the banner shows: the quick answer found something a rebuild fixes. A folder without a
 * slug is a problem too (`ok` is false), but rebuilding cannot settle it, so a banner for it would
 * never clear.
 */
export const hasFixableDrift = (answer: Pick<VerifyResult, "fixable"> | null): boolean =>
  answer !== null && answer.fixable > 0;
