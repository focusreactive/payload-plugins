import type { FolderId, ResolvedOptions } from "../types.js";
import { planFolderPaths } from "./folderRecords.js";
import type { FolderPathPlan, FolderRecord } from "./folderRecords.js";
import { noLocaleKey } from "./locales.js";
import type { PathDrift, TreeIssue } from "./treeIssues.js";

export type PlannedFolder = {
  /** The parent after repair: a cycle's lowest id and a folder with a missing parent go to the top. */
  expectedParent: FolderId | null;
  /** Whether `ancestorIds`, `depth` or a locale's `fullPath` differ from the plan. */
  isDrifted: boolean;
  /** A trashed folder is out of the tree: verify never reports it and repair never writes it. */
  isTrashed: boolean;
  /** `null` when the folder or an ancestor has no slug, so no path can be planned. */
  plan: FolderPathPlan | null;
  record: FolderRecord;
};

export type ParentFix = { folder: FolderRecord; reason: "cycle" | "missingParent" };

export type FolderAnalysis = {
  /** Every folder by id as text. */
  folders: Map<string, PlannedFolder>;
  issues: TreeIssue[];
  parentFixes: ParentFix[];
};

/** Numbers by value, anything else by text, so the lowest id is the same on both id types. */
const compareIds = (left: FolderId, right: FolderId): number =>
  typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right), "en", { numeric: true });

/** The folders that lie on a parent cycle, one array per cycle. */
const findCycles = (records: Map<string, FolderRecord>): FolderRecord[][] => {
  const state = new Map<string, "done" | "walking">();
  const cycles: FolderRecord[][] = [];

  for (const start of records.keys()) {
    if (state.has(start)) {
      continue;
    }
    const chain: string[] = [];
    let current: string | null = start;
    while (current !== null && records.has(current) && !state.has(current)) {
      state.set(current, "walking");
      chain.push(current);
      const parent: FolderId | null = (records.get(current) as FolderRecord).parent;
      current = parent === null ? null : String(parent);
    }
    if (current !== null && state.get(current) === "walking") {
      cycles.push(
        chain.slice(chain.indexOf(current)).map((key) => records.get(key) as FolderRecord)
      );
    }
    for (const key of chain) {
      state.set(key, "done");
    }
  }

  return cycles;
};

const describeFolderDrift = ({
  expectedPath,
  firstDrift,
  id,
}: {
  expectedPath: string;
  firstDrift: PathDrift | undefined;
  id: FolderId;
}): string => {
  if (!firstDrift) {
    return `Folder ${id} at ${expectedPath} has stale ancestor ids or depth`;
  }
  const where = firstDrift.locale === null ? "" : ` in ${firstDrift.locale}`;

  return firstDrift.stored === null
    ? `Folder ${id} has no path${where} and should be at ${firstDrift.expected}`
    : `Folder ${id} should be at ${firstDrift.expected}${where} but holds ${firstDrift.stored}`;
};

const toLocale = (key: string): string | null => (key === noLocaleKey ? null : key);

/**
 * Spec section 5.9 for folders, from the rows alone: parent cycles and parents that do not exist
 * (repair moves a cycle's lowest-id folder and an orphan to the top level), then every folder's
 * `ancestorIds`, `depth` and per-locale `fullPath` against what its parent chain says. A locale
 * whose `fullPath` row is missing counts as drift: the plugin writes every locale, so a missing
 * row comes from a raw write or from data older than the plugin, and a query by path in that
 * locale does not find the folder.
 */
export const analyzeFolders = ({
  defaultKey,
  keys,
  options,
  records: recordList,
}: {
  defaultKey: string;
  keys: string[];
  options: ResolvedOptions;
  records: FolderRecord[];
}): FolderAnalysis => {
  const records = new Map(recordList.map((record) => [String(record.id), record]));
  const issues: TreeIssue[] = [];
  const parentFixes: ParentFix[] = [];
  const expectedParents = new Map<string, FolderId | null>(
    recordList.map((record) => [String(record.id), record.parent])
  );
  const folderRef = (record: FolderRecord) => ({
    collection: options.folders.slug,
    id: record.id,
  });

  for (const cycle of findCycles(records)) {
    const lowest = cycle.reduce((best, record) =>
      compareIds(record.id, best.id) < 0 ? record : best
    );
    expectedParents.set(String(lowest.id), null);
    parentFixes.push({ folder: lowest, reason: "cycle" });
    issues.push({
      fixable: true,
      folders: cycle.map((record) => record.id).sort(compareIds),
      item: folderRef(lowest),
      kind: "folderCycle",
      message: `Folders ${cycle
        .map((record) => record.id)
        .sort(compareIds)
        .join(", ")} are each other's parents; repair moves folder ${lowest.id} to the top level`,
    });
  }
  for (const record of recordList) {
    if (record.parent !== null && !records.has(String(record.parent))) {
      expectedParents.set(String(record.id), null);
      parentFixes.push({ folder: record, reason: "missingParent" });
      issues.push({
        fixable: true,
        item: folderRef(record),
        kind: "folderParentMissing",
        message: `Folder ${record.id} names folder ${record.parent} as its parent, and that folder does not exist; repair moves it to the top level`,
        parent: record.parent,
      });
    }
  }

  // A folder that moves to the top level carries that parent in the row a later write sends back
  // whole, or the write would restore the parent it was moved away from (and, for a parent that
  // does not exist, fail on the foreign key).
  const movedIds = new Set(parentFixes.map(({ folder }) => String(folder.id)));
  const childrenOf = new Map<string | null, FolderRecord[]>();
  for (const stored of recordList) {
    const record = movedIds.has(String(stored.id))
      ? {
          ...stored,
          parent: null,
          storedRow: { ...stored.storedRow, parent: null },
        }
      : stored;
    const parent = expectedParents.get(String(record.id)) ?? null;
    const siblings = childrenOf.get(parent === null ? null : String(parent)) ?? [];
    siblings.push(record);
    childrenOf.set(parent === null ? null : String(parent), siblings);
  }

  const folders = new Map<string, PlannedFolder>();
  // Parents first, so each plan reads its parent's planned path. Every folder is reachable from
  // the top level now that cycles and orphans have been moved there.
  const pending: Array<{ record: FolderRecord; parent: FolderRecord | null; plannable: boolean }> =
    (childrenOf.get(null) ?? []).map((record) => ({ parent: null, plannable: true, record }));

  for (const { parent, plannable, record } of pending) {
    const key = String(record.id);
    const isTrashed = Boolean(record.storedRow.deletedAt);
    let plan: FolderPathPlan | null = null;
    let planned: FolderRecord | null = null;

    if (plannable) {
      plan = planFolderPaths({ defaultLocaleKey: defaultKey, keys, parent, slug: record.slug });
      if ((plan.fullPath[defaultKey] ?? "") === "") {
        plan = null;
        if (!isTrashed) {
          issues.push({
            fixable: false,
            item: folderRef(record),
            kind: "folderSlugMissing",
            message: `Folder ${record.id} has no slug in the default locale, so it and the folders beneath it have no path`,
          });
        }
      } else {
        planned = { ...record, ancestorIds: plan.ancestorIds, fullPath: plan.fullPath };
      }
    }

    let isDrifted = false;
    if (plan && !isTrashed) {
      const fullPath: PathDrift[] = keys
        .filter((localeKey) => (record.fullPath[localeKey] ?? "") !== plan?.fullPath[localeKey])
        .map((localeKey) => ({
          expected: plan?.fullPath[localeKey] ?? "",
          locale: toLocale(localeKey),
          stored: record.fullPath[localeKey] || null,
        }));
      const ancestorIds =
        record.ancestorIds === plan.ancestorIds
          ? undefined
          : { expected: plan.ancestorIds, stored: record.ancestorIds };
      const depth =
        record.depth === plan.depth ? undefined : { expected: plan.depth, stored: record.depth };
      isDrifted = fullPath.length > 0 || Boolean(ancestorIds) || Boolean(depth);
      if (isDrifted) {
        const expectedPath = plan.fullPath[defaultKey];
        const [firstDrift] = fullPath;
        issues.push({
          ancestorIds,
          depth,
          fixable: true,
          fullPath,
          item: folderRef(record),
          kind: "folderPath",
          message: describeFolderDrift({ expectedPath, firstDrift, id: record.id }),
          path: expectedPath,
        });
      }
    }

    folders.set(key, {
      expectedParent: expectedParents.get(key) ?? null,
      isDrifted,
      isTrashed,
      plan,
      record,
    });
    for (const child of childrenOf.get(key) ?? []) {
      pending.push({ parent: planned, plannable: planned !== null, record: child });
    }
  }

  return { folders, issues, parentFixes };
};
