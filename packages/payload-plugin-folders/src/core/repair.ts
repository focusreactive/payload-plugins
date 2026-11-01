import { createPayloadRequest } from "payload";
import type { CreatePayloadRequestArgs, Payload, PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { folderRedirectsSlug } from "../constants.js";
import { composeFullPath } from "../hooks/pages/fullPathAfterRead.js";
import type { PathChange, ResolvedOptions } from "../types.js";
import { queueAfterPathChange } from "./afterPathChange.js";
import { getDefaultLocaleKey, getFolderLocaleKeys, noLocaleKey } from "./locales.js";
import { writeKeyRewrites } from "./orderKeys.js";
import {
  planFolderPrefixRows,
  planPageRedirectRows,
  settleRedirectRows,
  shouldWriteRedirects,
  takenPathsOf,
} from "./redirects.js";
import type { RedirectRow } from "./redirects.js";
import { getResolvedOptions } from "./runtime.js";
import { patchLatestVersionStructure } from "./structureWrite.js";
import { writeFolderRow } from "./subtree.js";
import { listIssues } from "./treeIssues.js";
import type { IssueList, TreeIssue } from "./treeIssues.js";
import { bumpRevision, withTreeLock } from "./treeLock.js";
import { folderPathIn, getPageDefaultLocale, getPageLocaleKeys } from "./uniqueness.js";
import { analyzeTree } from "./verify.js";
import type { TreeAnalysis } from "./verify.js";
import type { PlannedFolder } from "./verifyFolders.js";
import { effectiveSegmentOf } from "./verifyPages.js";
import type { OwnSegments, PageFact } from "./verifyPages.js";

/** Path changes a dry run lists by name; `total` is the full count. */
const changeSampleLimit = 50;

const toLocale = (key: string): string | null => (key === noLocaleKey ? null : key);

const toText = (value: string): string | null => (value === "" ? null : value);

type RepairWrites = {
  folders: number;
  orderKeys: number;
  pages: number;
  redirectsDeleted: number;
  /** Redirect rows written or updated. */
  redirectsWritten: number;
  versions: number;
};

type FolderWriteSelection = {
  /** Folders to write, parents before children. */
  writes: PlannedFolder[];
  /** Folders left as they are because a path they would take belongs to another folder. */
  blocked: Map<string, { collision: PlannedFolder | null; key: string; path: string }>;
};

const pathClaimKey = (key: string, path: string): string => `${key}\u0000${path}`;

/**
 * Picks the folder rows to write. A folder whose planned path in some locale is the stored or
 * planned path of another folder stays as it is (`fullPath` is unique per locale, so the write
 * would fail and take the whole repair with it), and so does everything beneath it, which was
 * planned from that path. Such a clash is a conflict a person settles.
 */
const selectFolderWrites = (
  folders: Map<string, PlannedFolder>,
  keys: string[]
): FolderWriteSelection => {
  const all = [...folders.values()];
  const blocked = new Map<string, { collision: PlannedFolder | null; key: string; path: string }>();
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
      const clash = keys
        .map((key) => ({ key, path: folder.plan?.fullPath[key] ?? "" }))
        .find(({ key, path }) =>
          (claims.get(pathClaimKey(key, path)) ?? []).some((other) => other !== folder)
        );
      const parentIsBlocked =
        folder.expectedParent !== null && blocked.has(String(folder.expectedParent));
      if (clash || parentIsBlocked) {
        const collision = clash
          ? ((claims.get(pathClaimKey(clash.key, clash.path)) ?? []).find(
              (other) => other !== folder
            ) ?? null)
          : null;
        blocked.set(id, {
          collision,
          key: clash?.key ?? "",
          path: clash?.path ?? "",
        });
        changed = true;
      }
    }
  }

  // Parents first: the plan of a child was made from its parent's planned `ancestorIds`.
  const writes = all
    .filter((folder) => isWritten(folder))
    .sort((left, right) => (left.plan?.depth ?? 0) - (right.plan?.depth ?? 0));

  return { blocked, writes };
};

/**
 * Writes the folder rows in an order where no write takes a path another row still holds, since a
 * locale's `fullPath` is unique. Rows that wait on each other (two folders that swapped paths) are
 * cleared first, then written, which frees their paths.
 */
const writeFolderRows = async ({
  keys,
  options,
  req,
  writes,
  folders,
}: {
  folders: Map<string, PlannedFolder>;
  keys: string[];
  options: ResolvedOptions;
  req: PayloadRequest;
  writes: PlannedFolder[];
}): Promise<void> => {
  const held = new Map<string, string>();
  for (const folder of folders.values()) {
    for (const key of keys) {
      const path = folder.record.fullPath[key];
      if (path) {
        held.set(pathClaimKey(key, path), String(folder.record.id));
      }
    }
  }
  const release = (folder: PlannedFolder): void => {
    for (const key of keys) {
      const path = folder.record.fullPath[key];
      if (path && held.get(pathClaimKey(key, path)) === String(folder.record.id)) {
        held.delete(pathClaimKey(key, path));
      }
    }
  };
  const take = (folder: PlannedFolder): void => {
    for (const key of keys) {
      held.set(pathClaimKey(key, folder.plan?.fullPath[key] ?? ""), String(folder.record.id));
    }
  };
  const write = (folder: PlannedFolder, fullPath: Record<string, string>) => {
    const plan = folder.plan as NonNullable<PlannedFolder["plan"]>;

    return writeFolderRow({
      ancestorIds: plan.ancestorIds,
      depth: plan.depth,
      fullPath,
      options,
      record: folder.record,
      req,
    });
  };
  const isFree = (folder: PlannedFolder): boolean =>
    keys.every((key) => {
      const holder = held.get(pathClaimKey(key, folder.plan?.fullPath[key] ?? ""));

      return holder === undefined || holder === String(folder.record.id);
    });

  let waiting = writes;
  while (waiting.length > 0) {
    const ready = waiting.filter((folder) => isFree(folder));
    if (ready.length === 0) {
      // A cycle of rows each waiting on the next: empty their paths, then every one is free.
      for (const folder of waiting) {
        await write(folder, {});
        release(folder);
      }
      for (const folder of waiting) {
        await write(folder, (folder.plan as NonNullable<PlannedFolder["plan"]>).fullPath);
        take(folder);
      }
      break;
    }
    for (const folder of ready) {
      await write(folder, (folder.plan as NonNullable<PlannedFolder["plan"]>).fullPath);
      release(folder);
      take(folder);
    }
    waiting = waiting.filter((folder) => !ready.includes(folder));
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Rewrites a page's `pathSegment` (and its segment field when a legacy segment is lowercased) at
 * database level, with no hook, no version entry and no publish. The adapter deletes every locale
 * row of a document on a write that carries localized data and re-inserts only the locales it was
 * given, so the row goes back whole, as the read returned it with every locale, and only the
 * segment columns change.
 */
const writePageSegments = async ({
  fact,
  fixes,
  options,
  req,
}: {
  fact: PageFact;
  fixes: Record<string, string>;
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<boolean> => {
  const { payload } = req;
  const page = options.collections[fact.collection];
  const row = (await payload.db.findOne({
    collection: toCollectionSlug(fact.collection),
    locale: "all",
    req,
    where: { id: { equals: fact.id } },
  })) as Record<string, unknown> | null;
  if (!row) {
    return false;
  }
  const isLocalized = page.segmentLocalized && Boolean(payload.config.localization);
  const slugAfter: OwnSegments = { ...fact.ownSlug, ...fixes };
  const data: Record<string, unknown> = Object.fromEntries(
    Object.entries(row).filter(([name]) => name !== "id" && name !== "createdAt")
  );

  const storedSlug = row[page.segmentField];
  if (Object.keys(fixes).length > 0) {
    data[page.segmentField] = isLocalized
      ? { ...(isRecord(storedSlug) ? storedSlug : {}), ...fixes }
      : fixes[noLocaleKey];
  }
  // Only locales that already hold a value: a null for any other locale would create its row.
  data.pathSegment = isLocalized
    ? Object.fromEntries(
        [...new Set([...Object.keys(slugAfter), ...Object.keys(fact.ownStored)])].map((key) => [
          key,
          slugAfter[key] ?? null,
        ])
      )
    : (slugAfter[noLocaleKey] ?? null);

  await payload.db.updateOne({
    collection: toCollectionSlug(fact.collection),
    data,
    id: fact.id,
    req,
    returning: false,
  });

  return true;
};

type PlannedChanges = {
  changes: PathChange[];
  /** Pages whose effective segment changes in a locale, `collection:id:locale`; they get a redirect row. */
  segmentChanged: Set<string>;
};

/**
 * Every full path a repair changes, as a read returns it today and as it returns after: each
 * drifted folder, and each page whose folder path or segment changes (a page's path is its
 * folder's path plus its own segment, so a drifted folder moves every page beneath it, and a
 * backfilled `pathSegment` gives a page its first path). A locale that falls back reports the
 * fallback path, like a read does.
 */
const planPathChanges = (
  analysis: TreeAnalysis,
  options: ResolvedOptions,
  payload: Payload,
  writtenFolders: Set<string>
): PlannedChanges => {
  const { folders } = analysis.folderAnalysis;
  const folderKeys = getFolderLocaleKeys(payload, options);
  const folderDefaultKey = getDefaultLocaleKey(payload, options);
  const pageKeys = getPageLocaleKeys(payload);
  const defaultLocale = getPageDefaultLocale(payload);
  const changes: PathChange[] = [];
  const segmentChanged = new Set<string>();

  for (const folder of folders.values()) {
    if (!(folder.plan && writtenFolders.has(String(folder.record.id)))) {
      continue;
    }
    for (const key of folderKeys) {
      const from = folder.record.fullPath[key] || folder.record.fullPath[folderDefaultKey] || "";
      const to = folder.plan.fullPath[key];
      if (from !== to) {
        changes.push({
          collection: options.folders.slug,
          from: toText(from),
          id: folder.record.id,
          kind: "folder",
          locale: toLocale(key),
          published: true,
          to: toText(to),
        });
      }
    }
  }

  const fixesByPage = new Map(
    analysis.pageWrites.map(({ fact, fixes }) => [`${fact.collection}:${fact.id}`, fixes])
  );
  const pathOf = (
    fact: PageFact,
    key: string,
    segment: string,
    folderRecord: PlannedFolder["record"] | null
  ): string | null => {
    const folderPath = folderPathIn(folderRecord, key, options, payload);

    return composeFullPath({
      folderPath: toText(folderPath),
      hasFolder: fact.folder !== null,
      isFolderRoot: fact.isFolderRoot,
      pathSegment: toText(segment),
    });
  };

  for (const fact of analysis.pages) {
    const planned = fact.folder === null ? undefined : folders.get(String(fact.folder));
    const storedFolder = planned?.record ?? null;
    const expectedFolder =
      planned?.plan && writtenFolders.has(String(planned.record.id))
        ? { ...planned.record, fullPath: planned.plan.fullPath }
        : storedFolder;
    const slugAfter: OwnSegments = {
      ...fact.ownSlug,
      ...fixesByPage.get(`${fact.collection}:${fact.id}`),
    };
    for (const key of pageKeys) {
      const storedSegment = effectiveSegmentOf(fact.ownStored, key, defaultLocale);
      const expectedSegment = effectiveSegmentOf(slugAfter, key, defaultLocale);
      const from = pathOf(fact, key, storedSegment, storedFolder);
      const to = pathOf(fact, key, expectedSegment, expectedFolder);
      if (from === to) {
        continue;
      }
      changes.push({
        collection: fact.collection,
        from,
        id: fact.id,
        kind: "page",
        locale: toLocale(key),
        published: fact.liveKeys.includes(key),
        to,
      });
      if (storedSegment !== "" && expectedSegment !== "" && storedSegment !== expectedSegment) {
        segmentChanged.add(`${fact.collection}:${fact.id}:${key}`);
      }
    }
  }

  return { changes, segmentChanged };
};

/**
 * The redirect rows of a repair (spec section 5.6): a prefix row for each folder whose path
 * changed, standing for every page beneath it, and a page row for a page whose own segment
 * changed (a legacy `About` lowercased). A page that only gets its first path has nothing to
 * redirect from. A prefix row is written in a locale when any published page changed path there.
 */
const planRedirectRows = ({ changes, segmentChanged }: PlannedChanges): RedirectRow[] => {
  const publishedPageChanges = changes.filter(
    (change) => change.kind === "page" && change.published && change.from !== null
  );
  const onePerLocale = [
    ...new Map(publishedPageChanges.map((change) => [change.locale, change])).values(),
  ];
  const pageRows = planPageRedirectRows(
    changes.filter(
      (change) =>
        change.kind === "page" &&
        segmentChanged.has(`${change.collection}:${change.id}:${change.locale ?? noLocaleKey}`)
    )
  );
  const folderRows = changes
    .filter((change) => change.kind === "folder" && change.from !== null)
    .flatMap((change) =>
      planFolderPrefixRows({
        changes: [change, ...onePerLocale],
        folder: { collection: change.collection, id: change.id },
      })
    );

  return [...folderRows, ...pageRows];
};

export type RepairResult = {
  /** The URL changes handed to `hooks.afterPathChange` (reason `repair`), or that would be. */
  changes: { samples: PathChange[]; total: number };
  /** What repair leaves for a person: duplicates, two root pages, invalid segments it cannot fix. */
  conflicts: IssueList;
  dryRun: boolean;
  /** What repair fixed, or in a dry run would fix. */
  fixed: IssueList;
  /** The value of `folders-tree-state.revision` after the repair; `null` for a dry run or no write. */
  revision: number | null;
  /** Rows written, or in a dry run to be written. */
  writes: RepairWrites;
};

export type RepairTreeArgs = {
  /** Plan and report, write nothing, take no lock. */
  dryRun?: boolean;
  /** The request to run on, so a caller's transaction and user carry over. Default: a new one. */
  req?: PayloadRequest;
  /**
   * Write the redirect rows of the URLs that change. Default: `redirects.enabled`, or
   * `context.foldersRedirects` on `req`.
   */
  redirects?: boolean;
  /** Who repairs, for `hooks.afterPathChange`; ignored when `req` is given. */
  user?: CreatePayloadRequestArgs["user"];
};

type RepairPlan = {
  conflictIssues: TreeIssue[];
  fixedIssues: TreeIssue[];
  folderWrites: PlannedFolder[];
  planned: PlannedChanges;
  redirectRows: RedirectRow[];
};

/** What a repair of `analysis` would do, without touching the database. */
const planRepair = (
  analysis: TreeAnalysis,
  options: ResolvedOptions,
  payload: Payload
): RepairPlan => {
  const { folders } = analysis.folderAnalysis;
  const { blocked, writes: folderWrites } = selectFolderWrites(
    folders,
    getFolderLocaleKeys(payload, options)
  );
  const planned = planPathChanges(
    analysis,
    options,
    payload,
    new Set(folderWrites.map((folder) => String(folder.record.id)))
  );
  const isBlockedFolder = (issue: TreeIssue): boolean =>
    issue.kind === "folderPath" && blocked.has(String(issue.item.id));
  const listedDuplicates = new Set(
    analysis.issues.flatMap((issue) =>
      issue.kind === "duplicatePath" ? [`${issue.locale ?? noLocaleKey}\u0000${issue.path}`] : []
    )
  );
  // A folder held back because another folder has the path it would take is a conflict too,
  // unless the verify pass already listed that clash as a duplicate path.
  const blockIssues: TreeIssue[] = [...blocked.entries()].flatMap(
    ([id, { collision, key, path }]) => {
      const folder = folders.get(id);
      if (!(folder && collision) || listedDuplicates.has(`${key}\u0000${path}`)) {
        return [];
      }

      return [
        {
          count: 2,
          fixable: false,
          items: [
            { collection: options.folders.slug, id: folder.record.id },
            { collection: options.folders.slug, id: collision.record.id },
          ],
          kind: "duplicatePath",
          locale: toLocale(key),
          message: `Folders ${folder.record.id} and ${collision.record.id} both belong at ${path}; repair leaves both`,
          path,
        },
      ];
    }
  );

  return {
    conflictIssues: [
      ...analysis.issues.filter((issue) => !issue.fixable || isBlockedFolder(issue)),
      ...blockIssues,
    ],
    fixedIssues: analysis.issues.filter((issue) => issue.fixable && !isBlockedFolder(issue)),
    folderWrites,
    planned,
    redirectRows: planRedirectRows(planned),
  };
};

const toResult = ({
  analysis,
  dryRun,
  isWritingRows,
  plan,
  revision,
}: {
  analysis: TreeAnalysis;
  dryRun: boolean;
  isWritingRows: boolean;
  plan: RepairPlan;
  revision: number | null;
}): RepairResult => ({
  changes: {
    samples: plan.planned.changes.slice(0, changeSampleLimit),
    total: plan.planned.changes.length,
  },
  conflicts: listIssues(plan.conflictIssues),
  dryRun,
  fixed: listIssues(plan.fixedIssues),
  revision,
  writes: {
    folders: plan.folderWrites.length + analysis.folderAnalysis.parentFixes.length,
    orderKeys: analysis.keyRewrites.length,
    pages: analysis.pageWrites.length,
    redirectsDeleted: analysis.redirects.length,
    redirectsWritten: isWritingRows ? plan.redirectRows.length : 0,
    versions: analysis.staleVersions.length,
  },
});

/** The writes of a repair, in the order that keeps every intermediate state valid. */
const applyRepair = async ({
  analysis,
  isWritingRows,
  options,
  plan,
  req,
}: {
  analysis: TreeAnalysis;
  isWritingRows: boolean;
  options: ResolvedOptions;
  plan: RepairPlan;
  req: PayloadRequest;
}): Promise<void> => {
  const { payload } = req;
  const updatedAt = new Date().toISOString();

  for (const { folder } of analysis.folderAnalysis.parentFixes) {
    await payload.db.updateOne({
      collection: toCollectionSlug(options.folders.slug),
      data: { parent: null, structureRevision: folder.structureRevision + 1, updatedAt },
      id: folder.id,
      req,
      returning: false,
    });
  }
  await writeFolderRows({
    folders: analysis.folderAnalysis.folders,
    keys: getFolderLocaleKeys(payload, options),
    options,
    req,
    writes: plan.folderWrites,
  });

  for (const { fact, fixes } of analysis.pageWrites) {
    await writePageSegments({ fact, fixes, options, req });
  }

  // Versions before keys: a rewritten key patches the latest version itself, on top of this.
  const factsById = new Map(analysis.pages.map((fact) => [`${fact.collection}:${fact.id}`, fact]));
  for (const stale of analysis.staleVersions) {
    const main = factsById.get(`${stale.collection}:${stale.id}`);
    if (main) {
      await patchLatestVersionStructure(
        req,
        stale.collection,
        stale.id,
        {
          folder: main.folder,
          orderKey: main.orderKey,
          structureRevision: main.structureRevision,
        },
        updatedAt
      );
    }
  }
  await writeKeyRewrites(req, options, analysis.keyRewrites);

  if (analysis.redirects.length > 0) {
    await payload.db.deleteMany({
      collection: toCollectionSlug(folderRedirectsSlug),
      req,
      where: { id: { in: analysis.redirects.map((redirect) => redirect.id) } },
    });
  }
  await settleRedirectRows({
    clear:
      isWritingRows || options.redirects.enabled ? takenPathsOf(payload, plan.planned.changes) : [],
    req,
    rows: isWritingRows ? plan.redirectRows : [],
  });
};

/**
 * Spec section 5.9: fixes what has one right answer, in one transaction under the tree lock
 * (spec section 5.2), and lists the rest. Everything is read again after the lock is taken.
 *
 * - Folder cycles are broken by moving the lowest-id folder to the top level, and a folder whose
 *   parent does not exist goes to the top level too.
 * - Every folder's `ancestorIds`, `depth` and per-locale `fullPath` follow the parent chain, a
 *   missing locale row included.
 * - A page's `pathSegment` follows its own segment (the first path of a page that existed before
 *   the plugin), and a legacy segment that only fails the pattern by its capitals is saved in
 *   lowercase with a redirect from the old URL, unless another page or folder already has that
 *   path.
 * - The latest version of a page takes the main row's `folder`, `orderKey` and `structureRevision`.
 * - Rows without an `orderKey` get keys after their keyed siblings in `createdAt` order; equal and
 *   unusable keys rebalance their siblings in the order a read shows them.
 * - Redirect rows whose target is gone are deleted.
 *
 * Duplicate paths, two root pages in a folder, invalid segments with no safe fix and extra
 * tree-lock rows are listed in `conflicts` and left alone. `hooks.afterPathChange` runs after the
 * commit with every changed URL and reason `repair`.
 *
 * The whole repair is one transaction, so a large site holds the lock for as long as the writes
 * take, and other saves wait. Run it from `payload run` (the plugin's `dist/bin/repair.js`) rather
 * than from a request when the site has tens of thousands of pages.
 */
export const repairTree = async (
  payload: Payload,
  { dryRun = false, redirects, req: callerRequest, user }: RepairTreeArgs = {}
): Promise<RepairResult> => {
  const options = getResolvedOptions(payload);
  const req = callerRequest ?? (await createPayloadRequest({ payload, req: {}, user }));
  const isWritingRows = redirects ?? shouldWriteRedirects(req, options);

  if (dryRun) {
    const analysis = await analyzeTree(req, options, { quick: false });

    return toResult({
      analysis,
      dryRun,
      isWritingRows,
      plan: planRepair(analysis, options, payload),
      revision: null,
    });
  }

  return withTreeLock(req, async () => {
    const analysis = await analyzeTree(req, options, { quick: false });
    const plan = planRepair(analysis, options, payload);
    await applyRepair({
      analysis,
      isWritingRows,
      options,
      plan,
      req,
    });

    const result = toResult({ analysis, dryRun, isWritingRows, plan, revision: null });
    const hasWritten = Object.entries(result.writes).some(
      ([name, count]) => name !== "redirectsWritten" && count > 0
    );
    const revision = hasWritten ? await bumpRevision(req) : null;
    await queueAfterPathChange({ changes: plan.planned.changes, options, reason: "repair", req });

    return { ...result, revision };
  });
};
