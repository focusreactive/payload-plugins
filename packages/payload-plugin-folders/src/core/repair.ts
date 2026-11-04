import { createPayloadRequest } from "payload";
import type { CreatePayloadRequestArgs, Payload, PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { folderRedirectsSlug } from "../constants.js";
import { composeFullPath } from "../hooks/pages/fullPathAfterRead.js";
import type { FolderId, PathChange, ResolvedOptions } from "../types.js";
import { queueAfterPathChange } from "./afterPathChange.js";
import { withItemTitles } from "./issueTitles.js";
import {
  getDefaultLocaleKey,
  getFolderLocaleKeys,
  noLocaleKey,
  toLocaleOrNull,
} from "./locales.js";
import { rewriteMirrorFormDrift, settleMirror } from "./mirror.js";
import { writeKeyRewrites } from "./orderKeys.js";
import { pathClaimKey } from "./selectFolderWrites.js";
import {
  planFolderPrefixRows,
  planPageRedirectRows,
  settleRedirectRows,
  shouldWriteRedirects,
  takenPathsOf,
} from "./redirects.js";
import type { RedirectRow } from "./redirects.js";
import { getResolvedOptions } from "./runtime.js";
import { hasLatestVersion, patchLatestVersionStructure } from "./structureWrite.js";
import { writeFolderRow } from "./subtree.js";
import { listIssues } from "./treeIssues.js";
import type { IssueList, TreeIssue } from "./treeIssues.js";
import { bumpRevision, withTreeLock } from "./treeLock.js";
import { folderPathIn, getPageDefaultLocale, getPageLocaleKeys } from "./uniqueness.js";
import { analyzeTree } from "./verify.js";
import type { PageWrite, TreeAnalysis } from "./verify.js";
import type { PlannedFolder } from "./verifyFolders.js";
import { effectiveSegmentOf, toOwnSegments } from "./verifyPages.js";
import type { OwnSegments, PageFact } from "./verifyPages.js";
import { itemKey } from "./itemKey.js";

/** Path changes a dry run lists by name; `total` is the full count. */
const changeSampleLimit = 50;

const emptyToNull = (value: string): string | null => (value === "" ? null : value);

type RepairWrites = {
  folders: number;
  orderKeys: number;
  pages: number;
  redirectsDeleted: number;
  /** Redirect rows written or updated. */
  redirectsWritten: number;
  versions: number;
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
  const write = (folder: PlannedFolder, fullPath: Record<string, string> | null) => {
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
        await write(folder, null);
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
  options,
  pageWrite,
  req,
}: {
  options: ResolvedOptions;
  pageWrite: PageWrite;
  req: PayloadRequest;
}): Promise<boolean> => {
  const { fact, fixes, segmentsAfter } = pageWrite;
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
        [...new Set([...Object.keys(segmentsAfter), ...Object.keys(fact.ownStored)])].map((key) => [
          key,
          segmentsAfter[key] ?? null,
        ])
      )
    : (segmentsAfter[noLocaleKey] ?? null);

  await payload.db.updateOne({
    collection: toCollectionSlug(fact.collection),
    data,
    id: fact.id,
    req,
    returning: false,
  });

  return true;
};

/**
 * The same segment rewrite on the latest version of a page with drafts, which a draft read and
 * the next publish start from: left alone, the next publish writes the old segment back over the
 * fixed main row. The version's segment is lowercased only where it still equals the main row's
 * legacy value (a draft edited to something else keeps its edit), and its `pathSegment` follows the
 * version's own segment in every locale the page is not held back in, as the hook would set it.
 * The version goes back whole with its own `updatedAt`, for the reason `writePageSegments` does,
 * and so that a draft newer than the main row stays the one a draft read returns.
 */
const writeLatestVersionSegments = async ({
  options,
  pageWrite,
  req,
}: {
  options: ResolvedOptions;
  pageWrite: PageWrite;
  req: PayloadRequest;
}): Promise<void> => {
  const { fact, fixes, heldKeys } = pageWrite;
  const { payload } = req;
  if (!hasLatestVersion(payload, fact.collection)) {
    return;
  }
  const page = options.collections[fact.collection];
  const isLocalized = page.segmentLocalized && Boolean(payload.config.localization);
  const { docs } = (await payload.db.findVersions({
    collection: toCollectionSlug(fact.collection),
    limit: 1,
    locale: "all",
    pagination: false,
    req,
    where: { and: [{ parent: { equals: fact.id } }, { latest: { equals: true } }] },
  })) as unknown as {
    docs: Array<{ id: FolderId; updatedAt?: string; version?: Record<string, unknown> }>;
  };
  const [latest] = docs;
  if (!latest?.version) {
    return;
  }

  const version = latest.version;
  const versionSlug = toOwnSegments(version[page.segmentField]);
  const versionStored = toOwnSegments(version.pathSegment);
  const slugFixes = Object.fromEntries(
    Object.entries(fixes).filter(([key]) => versionSlug[key] === fact.ownSlug[key])
  );
  const slugAfter: OwnSegments = { ...versionSlug, ...slugFixes };
  const segmentKeys = [...new Set([...Object.keys(slugAfter), ...Object.keys(versionStored)])];
  const pathSegmentAfter: OwnSegments = Object.fromEntries(
    segmentKeys.flatMap((key): Array<[string, string]> => {
      const value = heldKeys.includes(key) ? versionStored[key] : slugAfter[key];

      return value === undefined ? [] : [[key, value]];
    })
  );
  const isChanged =
    Object.keys(slugFixes).length > 0 ||
    segmentKeys.some((key) => (pathSegmentAfter[key] ?? null) !== (versionStored[key] ?? null));
  if (!isChanged) {
    return;
  }

  const { id: _versionId, ...versionData } = version;
  if (Object.keys(slugFixes).length > 0) {
    const storedSlug = version[page.segmentField];
    versionData[page.segmentField] = isLocalized
      ? { ...(isRecord(storedSlug) ? storedSlug : {}), ...slugFixes }
      : slugFixes[noLocaleKey];
  }
  versionData.pathSegment = isLocalized
    ? Object.fromEntries(segmentKeys.map((key) => [key, pathSegmentAfter[key] ?? null]))
    : (pathSegmentAfter[noLocaleKey] ?? null);

  await payload.db.updateVersion({
    collection: toCollectionSlug(fact.collection),
    id: latest.id,
    req,
    returning: false,
    versionData: { updatedAt: latest.updatedAt, version: versionData },
  } as never);
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
          from: emptyToNull(from),
          id: folder.record.id,
          kind: "folder",
          locale: toLocaleOrNull(key),
          published: true,
          to: emptyToNull(to),
        });
      }
    }
  }

  const segmentsAfterByPage = new Map(
    analysis.pageWrites.map(({ fact, segmentsAfter }) => [itemKey(fact), segmentsAfter])
  );
  const pathOf = (
    fact: PageFact,
    key: string,
    segment: string,
    folderRecord: PlannedFolder["record"] | null
  ): string | null => {
    const folderPath = folderPathIn(folderRecord, key, options, payload);

    return composeFullPath({
      folderPath: emptyToNull(folderPath),
      hasFolder: fact.folder !== null,
      isFolderRoot: fact.isFolderRoot,
      pathSegment: emptyToNull(segment),
    });
  };

  for (const fact of analysis.pages) {
    const planned = fact.folder === null ? undefined : folders.get(String(fact.folder));
    const storedFolder = planned?.record ?? null;
    const expectedFolder =
      planned?.plan && writtenFolders.has(String(planned.record.id))
        ? { ...planned.record, fullPath: planned.plan.fullPath }
        : storedFolder;
    // A page with no write keeps its stored segments: no drift, or every drifted locale held back.
    const segmentsAfter: OwnSegments = segmentsAfterByPage.get(itemKey(fact)) ?? fact.ownStored;
    for (const key of pageKeys) {
      const storedSegment = effectiveSegmentOf(fact.ownStored, key, defaultLocale);
      const expectedSegment = effectiveSegmentOf(segmentsAfter, key, defaultLocale);
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
        locale: toLocaleOrNull(key),
        published: fact.liveKeys.includes(key),
        to,
      });
      if (storedSegment !== "" && expectedSegment !== "" && storedSegment !== expectedSegment) {
        segmentChanged.add(`${itemKey(fact)}:${key}`);
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
        segmentChanged.has(`${itemKey(change)}:${change.locale ?? noLocaleKey}`)
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
  /**
   * The rows written, or to be written, outnumber `limits.maxSyncDocuments`. The repair is one
   * transaction under the tree lock, so every page save waits for it (up to the lock's timeout):
   * a dialog warns before it, and a large site runs the script from a terminal instead.
   */
  isLarge: boolean;
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
  const { blocked, writes: folderWrites } = analysis.folderSelection;
  const planned = planPathChanges(
    analysis,
    options,
    payload,
    new Set(folderWrites.map((folder) => String(folder.record.id)))
  );
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
          items: [{ collection: options.folders.slug, id: folder.record.id }, collision],
          kind: "duplicatePath",
          locale: toLocaleOrNull(key),
          message:
            collision.collection === options.folders.slug
              ? `Folders ${folder.record.id} and ${collision.id} both belong at ${path}; repair leaves both`
              : `Folder ${folder.record.id} and ${collision.collection} ${collision.id} both belong at ${path}; repair leaves both`,
          path,
        },
      ];
    }
  );

  return {
    conflictIssues: [...analysis.issues.filter((issue) => !issue.fixable), ...blockIssues],
    fixedIssues: analysis.issues.filter((issue) => issue.fixable),
    folderWrites,
    planned,
    redirectRows: planRedirectRows(planned),
  };
};

const toResult = async ({
  analysis,
  dryRun,
  isWritingRows,
  options,
  plan,
  req,
  revision,
}: {
  analysis: TreeAnalysis;
  dryRun: boolean;
  isWritingRows: boolean;
  options: ResolvedOptions;
  plan: RepairPlan;
  req: PayloadRequest;
  revision: number | null;
}): Promise<RepairResult> => {
  const conflicts = listIssues(plan.conflictIssues);
  const fixed = listIssues(plan.fixedIssues);
  const writes: RepairWrites = {
    folders: plan.folderWrites.length + analysis.folderAnalysis.parentFixes.length,
    orderKeys: analysis.keyRewrites.length,
    pages: analysis.pageWrites.length,
    redirectsDeleted: analysis.redirects.length,
    redirectsWritten: isWritingRows ? plan.redirectRows.length : 0,
    versions: analysis.staleVersions.length,
  };

  return {
    changes: {
      samples: plan.planned.changes.slice(0, changeSampleLimit),
      total: plan.planned.changes.length,
    },
    conflicts: { ...conflicts, issues: await withItemTitles(req, options, conflicts.issues) },
    dryRun,
    fixed: { ...fixed, issues: await withItemTitles(req, options, fixed.issues) },
    isLarge:
      Object.values(writes).reduce((sum, count) => sum + count, 0) >
      options.limits.maxSyncDocuments,
    revision,
    writes,
  };
};

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

  for (const pageWrite of analysis.pageWrites) {
    await writePageSegments({ options, pageWrite, req });
    await writeLatestVersionSegments({ options, pageWrite, req });
  }

  // Versions before keys: a rewritten key patches the latest version itself, on top of this.
  const factsById = new Map(analysis.pages.map((fact) => [itemKey(fact), fact]));
  for (const stale of analysis.staleVersions) {
    const main = factsById.get(itemKey(stale));
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
  // Before the mirror settles, so a row it frees or writes meets the corrected `from` values.
  if (options.redirects.mirror) {
    await rewriteMirrorFormDrift({
      drift: analysis.mirrorRows,
      mirror: options.redirects.mirror,
      req,
    });
  }
  await settleRedirectRows({
    clear:
      isWritingRows || options.redirects.enabled ? takenPathsOf(payload, plan.planned.changes) : [],
    req,
    rows: isWritingRows ? plan.redirectRows : [],
  });
  await settleMirror({ changes: plan.planned.changes, options, req, write: isWritingRows });
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
 * - The latest version of a page with drafts takes the same segment fixes, so the next publish does
 *   not undo them, and the main row's `folder`, `orderKey` and `structureRevision`.
 * - Rows without an `orderKey` get keys after their keyed siblings in `createdAt` order; equal and
 *   unusable keys rebalance their siblings in the order a read shows them.
 * - Redirect rows whose target is gone are deleted.
 * - Rows of the redirects plugin that start or end at a plain path in the other
 *   `urls.trailingSlash` form are rewritten to the current one (the one row of a clash is kept).
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
      options,
      plan: planRepair(analysis, options, payload),
      req,
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

    const result = await toResult({
      analysis,
      dryRun,
      isWritingRows,
      options,
      plan,
      req,
      revision: null,
    });
    const hasWritten = Object.entries(result.writes).some(
      ([name, count]) => name !== "redirectsWritten" && count > 0
    );
    const revision = hasWritten ? await bumpRevision(req) : null;
    await queueAfterPathChange({ changes: plan.planned.changes, options, reason: "repair", req });

    return { ...result, revision };
  });
};
