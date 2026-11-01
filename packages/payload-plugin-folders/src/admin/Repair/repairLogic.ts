import type { RepairResult } from "../../core/repair.js";

/** Lines of one list the dialog writes out; the rest is "and N more". */
export const repairListLimit = 50;

export type RepairList = {
  /** The issues' plain-English sentences, the first `repairListLimit`. */
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
  /** Full URLs that would change, from the folders and the pages beneath them. */
  urlChanges: number;
};

const listOf = (list: RepairResult["fixed"]): RepairList => {
  const lines = list.issues.slice(0, repairListLimit).map((issue) => issue.message);

  return { lines, more: Math.max(0, list.total - lines.length), total: list.total };
};

/**
 * What the Rebuild dialog shows of a dry run: what repair would fix and what it leaves for a
 * person, each with its full count even where the server listed only a part (`issues` holds at
 * most 100 per kind, `total` is complete).
 */
export const repairListingOf = (result: RepairResult): RepairListing => {
  const fixed = listOf(result.fixed);
  const conflicts = listOf(result.conflicts);

  return {
    conflicts,
    fixed,
    isClean: fixed.total === 0 && conflicts.total === 0,
    isRepairable: fixed.total > 0,
    urlChanges: result.changes.total,
  };
};
