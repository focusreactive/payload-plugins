import type { FolderId, ItemRef } from "../types.js";

/** Most items an issue lists by name; its `count` is always the full number. */
export const issueItemLimit = 50;

/** Most issues of one kind a result lists; `counts` always holds the full totals. */
export const listedIssuesPerKind = 100;

export type PathDrift = {
  /** `null` when folder fields are not localized. */
  locale: string | null;
  /** What the parent chain says the path is. */
  expected: string;
  /** What the row holds; `null` when the locale has no row at all. */
  stored: string | null;
};

export type SegmentDrift = {
  /** `null` when the segment field is not localized. */
  locale: string | null;
  /** The page's own segment in that locale, `null` when it has none. */
  expected: string | null;
  /** What `pathSegment` holds, `null` when nothing. */
  stored: string | null;
};

export type StructureField = "folder" | "orderKey" | "structureRevision";

/**
 * An item an issue names. `kind` and `title` are filled by the full pass for the issues it lists
 * (one batched read per collection), so a dialog can name the item instead of its id; a quick
 * pass leaves them out, and an item whose title cannot be read has `title: null`.
 */
export type IssueItem = ItemRef & { kind?: "folder" | "page"; title?: string | null };

/**
 * One thing `verifyTree` found (spec section 5.9). `fixable` says whether `repairTree` has one right
 * answer for it and fixes it; the others are conflicts a person has to settle. `message` is a plain
 * English sentence for a log or a list; the other fields carry the facts for a dialog of your own.
 */
export type TreeIssue =
  | {
      kind: "folderPath";
      fixable: true;
      message: string;
      /** The folder. */
      item: IssueItem;
      /** The folder's expected path in the default locale. */
      path: string;
      ancestorIds?: { expected: string; stored: string | null };
      depth?: { expected: number; stored: number | null };
      fullPath: PathDrift[];
    }
  | {
      kind: "folderCycle";
      /** False when the folder repair would move to the top level has a segment the site reserves there. */
      fixable: boolean;
      message: string;
      /** Every folder of the cycle. */
      folders: FolderId[];
      /** The one repair moves to the top level: the lowest id. */
      item: IssueItem;
      /** The reserved top-level segment that stops the move. */
      reservedSegment?: string;
    }
  | {
      kind: "folderParentMissing";
      /** False when the folder has a segment the site reserves at the top level. */
      fixable: boolean;
      message: string;
      item: IssueItem;
      /** The id the folder names as its parent, which no folder has. */
      parent: FolderId;
      /** The reserved top-level segment that stops the move. */
      reservedSegment?: string;
    }
  | { kind: "folderSlugMissing"; fixable: false; message: string; item: IssueItem }
  | {
      kind: "pageSegment";
      /**
       * False for the locales of a page that is in a duplicate-path clash and already has a saved
       * segment: writing the segment would move the page onto the other claimant's URL.
       */
      fixable: boolean;
      message: string;
      item: IssueItem;
      segments: SegmentDrift[];
    }
  | {
      kind: "invalidSegment";
      fixable: boolean;
      message: string;
      item: IssueItem;
      locale: string | null;
      segment: string;
      /** The lowercased segment repair would save; `null` when no safe fix exists. */
      fixedSegment: string | null;
    }
  | {
      kind: "duplicatePath";
      fixable: false;
      message: string;
      locale: string | null;
      /** The URL path two or more items claim, in lowercase. */
      path: string;
      count: number;
      items: IssueItem[];
    }
  | {
      kind: "multipleRootPages";
      fixable: false;
      message: string;
      /** The folder; `null` is the top level. */
      folder: FolderId | null;
      /** The folder's name, once the full pass has read it. */
      folderTitle?: string | null;
      count: number;
      items: IssueItem[];
    }
  | {
      kind: "orderKeyMissing" | "orderKeyEqual" | "orderKeyInvalid";
      fixable: true;
      message: string;
      /** The folder whose children share the problem; `null` is the top level. */
      parent: FolderId | null;
      /** The folder's name, once the full pass has read it. */
      parentTitle?: string | null;
      count: number;
      items: IssueItem[];
    }
  | {
      kind: "staleVersion";
      fixable: true;
      message: string;
      item: IssueItem;
      fields: StructureField[];
    }
  | {
      kind: "danglingRedirect";
      fixable: true;
      message: string;
      /** The `folder-redirects` row. */
      id: FolderId;
      fromPath: string;
      locale: string | null;
      /** The document the row names; `null` when the row names none at all. */
      target: ItemRef | null;
    }
  | { kind: "treeStateRows"; fixable: false; message: string; ids: FolderId[] };

export type TreeIssueKind = TreeIssue["kind"];

export const treeIssueKinds: TreeIssueKind[] = [
  "folderPath",
  "folderCycle",
  "folderParentMissing",
  "folderSlugMissing",
  "pageSegment",
  "invalidSegment",
  "duplicatePath",
  "multipleRootPages",
  "orderKeyMissing",
  "orderKeyEqual",
  "orderKeyInvalid",
  "staleVersion",
  "danglingRedirect",
  "treeStateRows",
];

export type IssueCounts = Record<TreeIssueKind, number>;

export const emptyIssueCounts = (): IssueCounts =>
  Object.fromEntries(treeIssueKinds.map((kind) => [kind, 0])) as IssueCounts;

export type IssueList = {
  /** The full number of issues per kind. */
  counts: IssueCounts;
  /** At most `listedIssuesPerKind` per kind. */
  issues: TreeIssue[];
  total: number;
  /** True when `issues` leaves some out; `counts` and `total` stay complete. */
  truncated: boolean;
};

/** Counts every issue and keeps the first `listedIssuesPerKind` of each kind, in the order found. */
export const listIssues = (issues: TreeIssue[]): IssueList => {
  const counts = emptyIssueCounts();
  const listed: TreeIssue[] = [];
  for (const issue of issues) {
    counts[issue.kind] += 1;
    if (counts[issue.kind] <= listedIssuesPerKind) {
      listed.push(issue);
    }
  }

  return { counts, issues: listed, total: issues.length, truncated: listed.length < issues.length };
};

export const sampleItems = (items: ItemRef[]): ItemRef[] => items.slice(0, issueItemLimit);
