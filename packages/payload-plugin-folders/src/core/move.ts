import { APIError } from "payload";
import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type {
  FolderId,
  ItemRef,
  PathChange,
  ResolvedOptions,
  ResolvedPageCollection,
} from "../types.js";
import { checkAllowedTypes, describeAllowedTypes, lockSourceOf } from "./allowedTypes.js";
import {
  normalizeFolderReference,
  planFolderPaths,
  toFolderRecord,
  wouldCreateCycle,
} from "./folderRecords.js";
import type { FolderRecord } from "./folderRecords.js";
import { getDefaultLocaleKey, getFolderLocaleKeys, noLocaleKey } from "./locales.js";
import { findForbiddenMoves, findItemsRefusedUpdate, forbiddenMoveMessage } from "./moveAccess.js";
import { planKeysForInsert } from "./orderKeys.js";
import type { InsertPlan } from "./orderKeys.js";
import { effectiveSegmentsOf, isPublishedInLocale, readPageRows } from "./pageRecords.js";
import type { PageRow } from "./pageRecords.js";
import { joinPath, pathDepth } from "./paths.js";
import { getResolvedOptions } from "./runtime.js";
import {
  findPageChanges,
  planSubtreeRewrite,
  readFolderDescendants,
  selectWrittenPaths,
} from "./subtree.js";
import type { SubtreePlan } from "./subtree.js";
import {
  describeRootPageConflict,
  findRootPageConflict,
  findSegmentConflicts,
  folderPathIn,
  getPageDefaultLocale,
  getPageLocaleKeys,
  pageDepthIn,
  readTitle,
} from "./uniqueness.js";
import type { SegmentConflict } from "./uniqueness.js";

/** What the caller saw when it built the request; a mismatch means the tree moved on (spec section 6). */
export type ExpectedState = { orderKey: string | null; parentId: FolderId | null };

export type MoveTarget =
  | { after?: undefined; position?: "end" | "start"; toFolder: FolderId | null }
  | { after: ItemRef; position?: undefined; toFolder?: undefined };

export type MoveItemInput = ItemRef & { expected?: ExpectedState };

export type MoveRequest = {
  /** One or many, kept in the given order. */
  items: MoveItemInput[];
  /** Default: the plugin's `redirects.enabled`. */
  redirects?: boolean;
} & MoveTarget;

export type MoveBlockReason =
  | "conflict"
  | "cycle"
  | "depth"
  | "forbidden"
  | "reserved"
  | "rootPage"
  | "size"
  | "stale"
  | "type";

export type MoveBlock = {
  item: ItemRef;
  /** The locale a path conflict is in; `null` when localization is off. */
  locale?: string | null;
  message: string;
  reason: MoveBlockReason;
};

export type MoveWarning = { item: ItemRef; message: string; reason: "type" };

export type MovePreview = {
  blocked: MoveBlock[];
  /** Items dropped from the selection because their folder is selected too; they move with it. */
  droppedItems: ItemRef[];
  /** Folder rows the move rewrites, the moved folders included. */
  foldersRewritten: number;
  /** Page rows written by mirroring into `@payloadcms/plugin-redirects`; 0 when it is off. */
  mirrorRowsToWrite: number;
  ok: boolean;
  /** The key each moved item gets, `collection:id` to key. Indicative: the apply re-plans under the lock. */
  orderKeys: Record<string, string>;
  /** `folder-redirects` rows the move would write; 0 when redirects are off. */
  redirectRowsToWrite: number;
  /** Up to 5 changed page URLs, published ones first. */
  samples: Array<{
    collection: string;
    from: string;
    id: FolderId;
    locale: string | null;
    to: string;
  }>;
  /** The folder the items land in; `null` is the top level. */
  targetFolderId: FolderId | null;
  /**
   * Page URLs only (a folder path is not a page URL): `published` is pages whose URL changes in a
   * locale they are published in, `publishedAcrossLocales` the same counted per locale, and
   * `draftOnly` pages whose URL changes only where they are not published.
   */
  urlChanges: { draftOnly: number; published: number; publishedAcrossLocales: number };
  warnings: MoveWarning[];
};

export type PlannedMoveItem = {
  /** Every full path this item changes: itself, and for a folder its subfolders and pages. */
  changes: PathChange[];
  /** Set for a folder: the row as stored, and the row as it will be after the move. */
  folder: { current: FolderRecord; previous: FolderRecord; subtree: SubtreePlan | null } | null;
  kind: "folder" | "page";
  orderKey: string;
  /** Set for a page. */
  page: ResolvedPageCollection | null;
  /** Whether the item changes folder; a reorder inside one folder changes no path. */
  parentChanges: boolean;
  ref: ItemRef;
  /** The revision the item has after the move. */
  structureRevision: number;
};

export type MovePlan = {
  insertPlan: InsertPlan | null;
  items: PlannedMoveItem[];
  /** The folder whose lock hands its types to the target, when the target sits under one. */
  lockOwnerId: FolderId | null;
  preview: MovePreview;
  /** Whether `folder-redirects` rows are written for this move. */
  redirects: boolean;
  target: FolderRecord | null;
};

export const staleMessage = "This part of the tree changed. Reload and try again.";
export const cycleMessage = "A folder cannot be moved into itself or one of its subfolders";

const statusByReason: Record<MoveBlockReason, number> = {
  conflict: 409,
  cycle: 400,
  depth: 400,
  forbidden: 403,
  reserved: 400,
  rootPage: 409,
  size: 400,
  stale: 409,
  type: 400,
};

/** A move the checks of spec section 5.4 refused. Nothing was written. */
export class MoveBlockedError extends APIError<{
  blocked: MoveBlock[];
  item: ItemRef;
  reason: MoveBlockReason;
}> {
  readonly blocked: MoveBlock[];

  constructor(blocked: MoveBlock[]) {
    const [first] = blocked;
    super(
      first.message,
      statusByReason[first.reason],
      { blocked, item: first.item, reason: first.reason },
      true
    );
    // APIError sets the name to "APIError"; callers tell a refused move from other API errors by it.
    this.name = "MoveBlockedError";
    this.blocked = blocked;
  }
}

const itemKey = (ref: ItemRef): string => `${ref.collection}:${ref.id}`;

const badRequest = (message: string): APIError => new APIError(message, 400, null, true);

const idsOfAncestors = (ancestorIds: string | null): string[] =>
  (ancestorIds ?? "").split("/").filter((id) => id !== "");

const sameParent = (left: FolderId | null, right: FolderId | null): boolean =>
  String(left ?? null) === String(right ?? null);

const toLocaleOrNull = (key: string): string | null => (key === noLocaleKey ? null : key);

const sampleLimit = 5;

/**
 * The page URLs a set of path changes touches, counted the way a preview reports them: pages
 * published in a locale their URL changes in, the same counted per locale, and pages that change
 * only where they are not published. Folder paths are not page URLs and are left out.
 */
export const summarizePageChanges = (
  changes: PathChange[]
): {
  publishedChanges: PathChange[];
  samples: MovePreview["samples"];
  urlChanges: MovePreview["urlChanges"];
} => {
  const pageChanges = changes.filter((change) => change.kind === "page");
  const publishedIds = new Set<string>();
  const draftIds = new Set<string>();
  let publishedAcrossLocales = 0;
  for (const change of pageChanges) {
    const key = itemKey(change);
    if (change.published) {
      publishedIds.add(key);
      publishedAcrossLocales += 1;
    } else {
      draftIds.add(key);
    }
  }
  const draftOnly = [...draftIds].filter((key) => !publishedIds.has(key)).length;
  const publishedChanges = pageChanges.filter((change) => change.published);
  const samples = [...publishedChanges, ...pageChanges.filter((change) => !change.published)]
    .filter(
      (change): change is PathChange & { from: string; to: string } =>
        change.from !== null && change.to !== null
    )
    .slice(0, sampleLimit)
    .map((change) => ({
      collection: change.collection,
      from: change.from,
      id: change.id,
      locale: change.locale,
      to: change.to,
    }));

  return {
    publishedChanges,
    samples,
    urlChanges: { draftOnly, published: publishedIds.size, publishedAcrossLocales },
  };
};

export type PlanSettings = {
  /**
   * Default false, as Payload 4's Local API: the collections' `update` access, and `access.move`,
   * are asked as the user of `req` (spec section 9), and a refusal is a `forbidden` block. True
   * checks no access, for the plugin's own system calls.
   */
  overrideAccess?: boolean;
};

/** A moved item's rows, read once. */
type Subject = {
  folder: FolderRecord | null;
  kind: "folder" | "page";
  /** The folder the item sits in now. */
  parentId: FolderId | null;
  page: ResolvedPageCollection | null;
  ref: ItemRef;
  row: PageRow | null;
  expected: ExpectedState | undefined;
};

const readFolderRecords = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  ids: FolderId[]
): Promise<Map<string, FolderRecord>> => {
  const records = new Map<string, FolderRecord>();
  if (ids.length === 0) {
    return records;
  }
  const { docs } = await req.payload.db.find({
    collection: toCollectionSlug(options.folders.slug),
    locale: "all",
    pagination: false,
    req,
    where: { id: { in: ids } },
  });
  for (const doc of docs as Array<Record<string, unknown>>) {
    const record = toFolderRecord(doc);
    records.set(String(record.id), record);
  }

  return records;
};

const isRootPage = (subject: Subject): boolean =>
  subject.kind === "page" && Boolean(subject.row?.isFolderRoot);

const folderDepthOf = (folder: FolderRecord, defaultKey: string): number =>
  folder.depth ?? pathDepth(folder.fullPath[defaultKey] ?? "");

/** A page's full path in locale slot `key`, or `null` while it has no segment there. */
const pagePathIn = ({
  folder,
  isFolderRoot,
  key,
  options,
  payload,
  segment,
}: {
  folder: FolderRecord | null;
  isFolderRoot: boolean;
  key: string;
  options: ResolvedOptions;
  payload: PayloadRequest["payload"];
  segment: string;
}): string | null => {
  const folderPath = folder ? folderPathIn(folder, key, options, payload) : "";
  if (folder && folderPath === "") {
    return null;
  }
  if (isFolderRoot) {
    return folder ? folderPath : "/";
  }

  return segment === "" ? null : joinPath(folderPath, segment);
};

/**
 * Spec sections 5.2 to 5.4 and 6 without writing anything: reads the moved items and the target,
 * runs every check, and works out the paths, the redirect counts and the order keys. Call it under
 * the tree lock when the result will be written (`applyMove` does), and without it for a preview.
 *
 * Checks that depend on data a missing row would make meaningless (a vanished target, too many
 * items) answer alone. The rest run for every item, and the first refusal of an item is the one
 * reported for it. `droppedItems` lists what moves with its folder instead of on its own.
 *
 * A malformed request (no items, an unknown collection, both or neither of `toFolder` and `after`,
 * a `toFolder` that is not a folder id or `null`, an `after` item that is also selected) throws a
 * 400 instead of returning a preview.
 *
 * Unless `overrideAccess` is true, the access checks of spec section 9 run last, once every other
 * check passed and the order keys are known, because the access functions are asked about the
 * order key the item gets.
 */
export const buildMovePlan = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  request: MoveRequest,
  { overrideAccess = false }: PlanSettings = {}
): Promise<MovePlan> => {
  const { payload } = req;
  const foldersSlug = options.folders.slug;
  const folderKeys = getFolderLocaleKeys(payload, options);
  const defaultFolderKey = getDefaultLocaleKey(payload, options);
  const pageKeys = getPageLocaleKeys(payload);
  const pageDefaultLocale = getPageDefaultLocale(payload);
  const redirects = request.redirects ?? options.redirects.enabled;

  if (request.items.length === 0) {
    throw badRequest("Choose at least one item to move");
  }
  const hasAfter = request.after !== undefined && request.after !== null;
  const hasToFolder = request.toFolder !== undefined;
  if (hasAfter === hasToFolder) {
    throw badRequest("Name the target with either `toFolder` or `after`");
  }
  if (hasToFolder && normalizeFolderReference(request.toFolder).invalid) {
    throw badRequest("Use null for the top level of the tree: 0 is not a folder");
  }
  for (const item of request.items) {
    if (item.collection !== foldersSlug && !options.collections[item.collection]) {
      throw badRequest(`"${item.collection}" is not a folder or a page collection of the tree`);
    }
  }

  const blocked: MoveBlock[] = [];
  const warnings: MoveWarning[] = [];
  const blockedKeys = new Set<string>();
  const block = (
    item: ItemRef,
    reason: MoveBlockReason,
    message: string,
    locale?: string | null
  ): void => {
    blocked.push({ item, message, reason, ...(locale === undefined ? {} : { locale }) });
    blockedKeys.add(itemKey(item));
  };

  const emptyPreview = (targetFolderId: FolderId | null): MovePreview => ({
    blocked,
    droppedItems: [],
    foldersRewritten: 0,
    mirrorRowsToWrite: 0,
    ok: blocked.length === 0,
    orderKeys: {},
    redirectRowsToWrite: 0,
    samples: [],
    targetFolderId,
    urlChanges: { draftOnly: 0, published: 0, publishedAcrossLocales: 0 },
    warnings,
  });
  const finish = (
    targetFolderId: FolderId | null,
    target: FolderRecord | null,
    preview: Partial<MovePreview> = {}
  ): MovePlan => ({
    insertPlan: null,
    items: [],
    lockOwnerId: null,
    preview: { ...emptyPreview(targetFolderId), ...preview, blocked, warnings },
    redirects,
    target,
  });

  const [firstRequested] = request.items;
  const firstRef: ItemRef = { collection: firstRequested.collection, id: firstRequested.id };

  if (request.items.length > options.limits.maxItemsPerMove) {
    const over = request.items[options.limits.maxItemsPerMove];
    block(
      { collection: over.collection, id: over.id },
      "size",
      `Move at most ${options.limits.maxItemsPerMove} items at once`
    );

    return finish(null, null);
  }

  // The same item named twice moves once, at the position of its first mention.
  const requested = request.items.filter(
    (item, index) =>
      request.items.findIndex(
        (other) => other.collection === item.collection && String(other.id) === String(item.id)
      ) === index
  );

  // Read every moved row: one query per collection.
  const subjects: Subject[] = [];
  const subjectByKey = new Map<string, Subject>();
  const folderRecords = await readFolderRecords(
    req,
    options,
    requested.filter((item) => item.collection === foldersSlug).map((item) => item.id)
  );
  const pageRowsByCollection = new Map<string, Map<string, PageRow>>();
  for (const page of Object.values(options.collections)) {
    pageRowsByCollection.set(
      page.slug,
      await readPageRows(
        req,
        page,
        requested.filter((item) => item.collection === page.slug).map((item) => item.id)
      )
    );
  }
  for (const item of requested) {
    const ref: ItemRef = { collection: item.collection, id: item.id };
    if (item.collection === foldersSlug) {
      const folder = folderRecords.get(String(item.id));
      if (!folder) {
        block(ref, "stale", `${staleMessage} A selected folder no longer exists.`);
        continue;
      }
      const subject: Subject = {
        expected: item.expected,
        folder,
        kind: "folder",
        page: null,
        parentId: folder.parent,
        ref: { collection: item.collection, id: folder.id },
        row: null,
      };
      subjects.push(subject);
      subjectByKey.set(itemKey(subject.ref), subject);
      continue;
    }
    const row = pageRowsByCollection.get(item.collection)?.get(String(item.id));
    if (!row) {
      block(ref, "stale", `${staleMessage} A selected page no longer exists.`);
      continue;
    }
    const subject: Subject = {
      expected: item.expected,
      folder: null,
      kind: "page",
      page: options.collections[item.collection],
      parentId: row.folder,
      ref,
      row,
    };
    subjects.push(subject);
    subjectByKey.set(itemKey(ref), subject);
  }

  // The parents of the selected pages: their paths, and their ancestry for the selection rule.
  const parentRecords = new Map<string, FolderRecord>(folderRecords);
  const missingParentIds = subjects
    .filter((subject) => subject.kind === "page" && subject.parentId !== null)
    .map((subject) => subject.parentId as FolderId)
    .filter((id) => !parentRecords.has(String(id)));
  for (const [id, record] of await readFolderRecords(req, options, missingParentIds)) {
    parentRecords.set(id, record);
  }

  // The target: a folder, or the parent of the sibling the items go after.
  let targetId: FolderId | null;
  if (hasAfter && request.after) {
    const { after } = request;
    if (requested.some((item) => itemKey(item) === itemKey(after))) {
      throw badRequest("The item to place the selection after cannot be part of the selection");
    }
    let afterParent: FolderId | null | undefined;
    if (after.collection === foldersSlug) {
      afterParent = (await readFolderRecords(req, options, [after.id])).get(
        String(after.id)
      )?.parent;
    } else if (options.collections[after.collection]) {
      afterParent = (
        await readPageRows(req, options.collections[after.collection], [after.id])
      ).get(String(after.id))?.folder;
    } else {
      throw badRequest(`"${after.collection}" is not a folder or a page collection of the tree`);
    }
    if (afterParent === undefined) {
      block(
        firstRef,
        "stale",
        `${staleMessage} The item to place the selection after no longer exists.`
      );

      return finish(null, null);
    }
    targetId = afterParent;
  } else {
    targetId = request.toFolder ?? null;
  }
  let target: FolderRecord | null = null;
  if (targetId !== null) {
    target =
      parentRecords.get(String(targetId)) ??
      (await readFolderRecords(req, options, [targetId])).get(String(targetId)) ??
      null;
    if (!target) {
      block(firstRef, "stale", `${staleMessage} The target folder no longer exists.`);

      return finish(null, null);
    }
    targetId = target.id;
  }
  const targetPath = target
    ? target.fullPath[defaultFolderKey] || "the target folder"
    : "the top level";

  // Selection rule: an item whose folder, or any folder above it, is selected moves with that folder.
  const selectedFolderIds = new Set(
    subjects.filter((subject) => subject.kind === "folder").map((subject) => String(subject.ref.id))
  );
  const droppedItems: ItemRef[] = [];
  const kept: Subject[] = [];
  for (const subject of subjects) {
    let ancestors: string[] = [];
    if (subject.kind === "folder" && subject.folder) {
      ancestors = idsOfAncestors(subject.folder.ancestorIds);
    } else if (subject.parentId !== null) {
      ancestors = [
        String(subject.parentId),
        ...idsOfAncestors(parentRecords.get(String(subject.parentId))?.ancestorIds ?? null),
      ];
    }
    if (ancestors.some((id) => selectedFolderIds.has(id))) {
      droppedItems.push(subject.ref);
    } else {
      kept.push(subject);
    }
  }

  // Stale state.
  for (const subject of kept) {
    const { expected } = subject;
    if (!expected) {
      continue;
    }
    const storedKey = subject.kind === "folder" ? subject.folder?.orderKey : subject.row?.orderKey;
    if (
      !sameParent(expected.parentId, subject.parentId) ||
      (expected.orderKey ?? null) !== (storedKey ?? null)
    ) {
      block(subject.ref, "stale", staleMessage);
    }
  }

  const live = (): Subject[] => kept.filter((subject) => !blockedKeys.has(itemKey(subject.ref)));
  const labelOf = async (subject: Subject): Promise<string> => {
    if (subject.kind === "folder" && subject.folder) {
      return (
        subject.folder.name[defaultFolderKey] ||
        subject.folder.fullPath[defaultFolderKey] ||
        `Folder ${subject.ref.id}`
      );
    }

    return subject.page ? readTitle(req, subject.page, subject.ref.id, pageDefaultLocale) : "";
  };
  const changesParent = (subject: Subject): boolean => !sameParent(subject.parentId, targetId);

  // Access, first pass (spec section 5.4 order): may the user put each item into this folder at
  // all? It runs before any check that reads the target's content, so a refused user is told
  // "forbidden" and not that a path inside a folder they may not enter is taken.
  if (!overrideAccess) {
    const refusedUpdates = await findItemsRefusedUpdate({
      items: live(),
      req,
      targetId,
    });
    for (const subject of live()) {
      if (refusedUpdates.has(itemKey(subject.ref))) {
        block(subject.ref, "forbidden", forbiddenMoveMessage);
      }
    }
  }

  // Cycle.
  for (const subject of live()) {
    if (
      subject.kind === "folder" &&
      subject.folder &&
      target &&
      wouldCreateCycle(subject.ref.id, target)
    ) {
      block(subject.ref, "cycle", cycleMessage);
    }
  }

  // Size: folder rows rewritten, counted before the subtrees are read.
  const descendantsByFolder = new Map<string, FolderRecord[]>();
  let foldersRewritten = 0;
  for (const subject of live()) {
    if (subject.kind !== "folder" || !changesParent(subject)) {
      continue;
    }
    const { totalDocs } = await payload.db.count({
      collection: toCollectionSlug(foldersSlug),
      req,
      where: { ancestorIds: { contains: `/${subject.ref.id}/` } },
    });
    foldersRewritten += totalDocs + 1;
    if (foldersRewritten > options.limits.maxFoldersPerMove) {
      block(
        subject.ref,
        "size",
        `This move would rewrite ${foldersRewritten} folders; the limit is ${options.limits.maxFoldersPerMove}`
      );
      continue;
    }
    descendantsByFolder.set(
      String(subject.ref.id),
      await readFolderDescendants(req, options, subject.ref.id)
    );
  }

  // Depth: the deepest path the moved subtree reaches after the move.
  const targetDepth = target ? folderDepthOf(target, defaultFolderKey) : 0;
  for (const subject of live()) {
    if (!changesParent(subject)) {
      continue;
    }
    let deepest: number;
    if (subject.kind === "page" && subject.row) {
      deepest = pageDepthIn(target, subject.row.isFolderRoot);
    } else if (subject.folder) {
      const descendants = descendantsByFolder.get(String(subject.ref.id)) ?? [];
      const ownDepth = folderDepthOf(subject.folder, defaultFolderKey);
      const newDepth = targetDepth + 1;
      const shift = newDepth - ownDepth;
      const deepestFolder = Math.max(
        newDepth,
        ...descendants.map((folder) => folderDepthOf(folder, defaultFolderKey) + shift)
      );
      deepest = deepestFolder;
      if (deepestFolder === options.maxDepth) {
        // A page that is not a root page sits one level below its folder.
        const deepestIds = [subject.folder, ...descendants]
          .filter((folder) => folderDepthOf(folder, defaultFolderKey) + shift === deepestFolder)
          .map((folder) => folder.id);
        for (const page of Object.values(options.collections)) {
          const { totalDocs } = await payload.db.count({
            collection: toCollectionSlug(page.slug),
            req,
            where: {
              and: [{ folder: { in: deepestIds } }, { isFolderRoot: { not_equals: true } }],
            },
          });
          if (totalDocs > 0) {
            deepest = deepestFolder + 1;
            break;
          }
        }
      }
    } else {
      continue;
    }
    if (deepest > options.maxDepth) {
      block(
        subject.ref,
        "depth",
        `This would make URLs ${deepest} segments deep; the limit is ${options.maxDepth}`
      );
    }
  }

  // Segments of a moved item in each locale it is read in: folders per folder locale slot, pages per page locale.
  const segmentsOf = (subject: Subject): Array<{ key: string; segment: string }> => {
    if (subject.kind === "page" && subject.row) {
      const effective = effectiveSegmentsOf(subject.row, pageKeys, pageDefaultLocale);

      return pageKeys.map((key) => ({ key, segment: effective[key] }));
    }
    const slug = subject.folder?.slug ?? {};

    return folderKeys.flatMap((folderKey) => {
      const segment = slug[folderKey] || slug[defaultFolderKey] || "";
      // Unlocalized folder segments apply in every locale a page can be read in.
      const slots = folderKey === noLocaleKey ? pageKeys : [folderKey];

      return slots.map((key) => ({ key, segment }));
    });
  };

  // Segments the site root cannot take: the ones the site itself uses, and the ones with a dot, so
  // robots.txt and sitemap.xml stay the frontend's. A legacy segment that fails the segment pattern
  // (`About`) is accepted until it is edited (spec section 2.6), so it may move back to the root.
  if (target === null) {
    // Lowercased on both sides: a legacy `Admin` is still the site's `/admin` (decision 22).
    const reservedRootSegments = new Set(
      options.reservedRootSegments.map((segment) => segment.toLowerCase())
    );
    for (const subject of live()) {
      if (!changesParent(subject) || isRootPage(subject)) {
        continue;
      }
      for (const { segment } of segmentsOf(subject)) {
        if (segment === "") {
          continue;
        }
        if (reservedRootSegments.has(segment.toLowerCase())) {
          block(subject.ref, "reserved", `/${segment} is used by the site itself`);
          break;
        }
        if (segment.includes(".")) {
          block(
            subject.ref,
            "reserved",
            `/${segment} cannot be at the top level: a top-level segment cannot contain a dot`
          );
          break;
        }
      }
    }
  }

  // Allowed types: pages that would land in a folder that refuses their type, including pages
  // inside a moved folder.
  const typeSubjects = live().filter(changesParent);
  const typeCheck = await checkAllowedTypes(
    targetId,
    typeSubjects.map((subject) => subject.ref),
    { options, req }
  );
  if (!typeCheck.isAllowed && target) {
    const countsByItem = new Map(
      typeCheck.refusedItems.map((refused) => [itemKey(refused.item), refused.count])
    );
    for (const subject of typeSubjects) {
      const count = countsByItem.get(itemKey(subject.ref));
      if (count === undefined) {
        continue;
      }
      const base = describeAllowedTypes(targetPath, target.allowedTypes, options);
      const message =
        subject.kind === "folder"
          ? `${base}; ${count === 1 ? "a page" : "pages"} inside this folder would not fit`
          : base;
      if (options.enforceAllowedTypesOnMove) {
        block(subject.ref, "type", message);
      } else {
        warnings.push({ item: subject.ref, message, reason: "type" });
      }
    }
  }

  // Path conflicts in every locale against the stored rows, root pages, and the moved items
  // against each other.
  // The stored rows are read once per locale for every segment that moves, not once per item.
  const segmentsByKey = new Map<string, Set<string>>();
  for (const subject of live()) {
    if (!changesParent(subject) || isRootPage(subject)) {
      continue;
    }
    for (const { key, segment } of segmentsOf(subject)) {
      if (segment !== "") {
        segmentsByKey.set(key, (segmentsByKey.get(key) ?? new Set()).add(segment));
      }
    }
  }
  const storedConflicts = new Map<string, Map<string, SegmentConflict>>();
  for (const [key, segments] of segmentsByKey) {
    storedConflicts.set(
      key,
      await findSegmentConflicts({
        folder: target,
        locale: key,
        options,
        publishedOnly: true,
        req,
        segments: [...segments],
      })
    );
  }
  const claimedSegments = new Map<string, Subject>();
  let claimedRootPage: Subject | null = null;
  for (const subject of live()) {
    if (!changesParent(subject)) {
      continue;
    }
    const targetLabel = target ? targetPath : "the top level";

    if (isRootPage(subject)) {
      if (claimedRootPage !== null) {
        block(
          subject.ref,
          "rootPage",
          `"${await labelOf(subject)}" cannot move to ${targetLabel}: ${await labelOf(claimedRootPage)} is already moving there as its root page`
        );
        continue;
      }
      const conflict = await findRootPageConflict({
        folder: target,
        options,
        req,
        self: { collection: subject.ref.collection, id: subject.ref.id },
      });
      if (conflict) {
        block(
          subject.ref,
          "rootPage",
          `"${await labelOf(subject)}" cannot move to ${targetLabel}: ${describeRootPageConflict(conflict, target ? targetPath : "/")}`
        );
        continue;
      }
      claimedRootPage = subject;
      continue;
    }

    const checked = new Set<string>();
    for (const { key, segment } of segmentsOf(subject)) {
      const claimKey = `${key}\u0000${segment}`;
      if (segment === "" || checked.has(claimKey)) {
        continue;
      }
      checked.add(claimKey);
      const localeSuffix = key === noLocaleKey ? "" : ` in ${key}`;
      const path = joinPath(target ? folderPathIn(target, key, options, payload) : "", segment);
      const claimedBy = claimedSegments.get(claimKey);
      if (claimedBy !== undefined) {
        block(
          subject.ref,
          "conflict",
          `"${await labelOf(subject)}" cannot move to ${targetLabel}: ${path} is already used by ${await labelOf(claimedBy)}${localeSuffix}`,
          toLocaleOrNull(key)
        );
        break;
      }
      const conflict = storedConflicts.get(key)?.get(segment);
      if (conflict) {
        const other = conflict.kind === "folder" ? "a folder" : conflict.title;
        block(
          subject.ref,
          "conflict",
          `"${await labelOf(subject)}" cannot move to ${targetLabel}: ${conflict.path} is already used by ${other}${localeSuffix}`,
          toLocaleOrNull(key)
        );
        break;
      }
      claimedSegments.set(claimKey, subject);
    }
  }

  const moving = live();
  if (blocked.length > 0 || moving.length === 0) {
    return finish(targetId, target, { droppedItems });
  }

  // Order keys for the target gap, in the given order.
  let at: "end" | "start" | { after: ItemRef } = request.position === "end" ? "end" : "start";
  if (hasAfter && request.after) {
    at = { after: request.after };
  }
  const insertPlan = await planKeysForInsert(req, options, {
    at,
    count: moving.length,
    exclude: moving.map((subject) => subject.ref),
    parent: targetId,
  });

  const items: PlannedMoveItem[] = [];
  for (const [index, subject] of moving.entries()) {
    const orderKey = insertPlan.keys[index];
    const parentChanges = changesParent(subject);
    const changes: PathChange[] = [];

    if (subject.kind === "page" && subject.row && subject.page) {
      const { row, page } = subject;
      if (parentChanges) {
        const hasDrafts = Boolean(
          payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts
        );
        const currentFolder =
          row.folder === null ? null : (parentRecords.get(String(row.folder)) ?? null);
        const effective = effectiveSegmentsOf(row, pageKeys, pageDefaultLocale);
        for (const key of pageKeys) {
          const from = pagePathIn({
            folder: currentFolder,
            isFolderRoot: row.isFolderRoot,
            key,
            options,
            payload,
            segment: effective[key],
          });
          const to = pagePathIn({
            folder: target,
            isFolderRoot: row.isFolderRoot,
            key,
            options,
            payload,
            segment: effective[key],
          });
          if (from !== to) {
            changes.push({
              collection: page.slug,
              from,
              id: subject.ref.id,
              kind: "page",
              locale: toLocaleOrNull(key),
              published: isPublishedInLocale(row.status, key, hasDrafts),
              to,
            });
          }
        }
      }
      items.push({
        changes,
        folder: null,
        kind: "page",
        orderKey,
        page,
        parentChanges,
        ref: subject.ref,
        structureRevision: row.structureRevision + 1,
      });
      continue;
    }

    const previous = subject.folder as FolderRecord;
    const structureRevision = previous.structureRevision + 1;
    const rootPlan = planFolderPaths({
      defaultLocaleKey: defaultFolderKey,
      keys: folderKeys,
      parent: target,
      slug: previous.slug,
    });
    const current: FolderRecord = {
      ...previous,
      ancestorIds: parentChanges ? rootPlan.ancestorIds : previous.ancestorIds,
      depth: parentChanges ? rootPlan.depth : previous.depth,
      fullPath: parentChanges
        ? selectWrittenPaths({
            defaultKey: defaultFolderKey,
            keys: folderKeys,
            plan: rootPlan,
            record: previous,
          })
        : previous.fullPath,
      orderKey,
      parent: targetId,
      storedRow: { ...previous.storedRow, orderKey, parent: targetId, structureRevision },
      structureRevision,
    };
    let subtree: SubtreePlan | null = null;
    if (parentChanges) {
      subtree = planSubtreeRewrite({
        descendants: descendantsByFolder.get(String(subject.ref.id)) ?? [],
        options,
        previousRoot: previous,
        req,
        root: current,
      });
      changes.push(
        ...subtree.changes,
        ...(await findPageChanges({
          currentById: subtree.currentById,
          options,
          previousById: subtree.previousById,
          req,
        }))
      );
    }
    items.push({
      changes,
      folder: { current, previous, subtree },
      kind: "folder",
      orderKey,
      page: null,
      parentChanges,
      ref: subject.ref,
      structureRevision,
    });
  }

  if (!overrideAccess) {
    const forbidden = await findForbiddenMoves({
      items,
      options,
      req,
      targetId,
    });
    if (forbidden.length > 0) {
      for (const refusal of forbidden) {
        blocked.push(refusal);
        blockedKeys.add(itemKey(refusal.item));
      }

      return finish(targetId, target, { droppedItems });
    }
  }

  // Counts and samples.
  const allChanges = items.flatMap((item) => item.changes);
  const { publishedChanges, samples, urlChanges } = summarizePageChanges(allChanges);
  const redirectRowsToWrite = redirects
    ? items.reduce(
        (sum, item) =>
          sum +
          (item.kind === "folder"
            ? item.changes.filter(
                (change) =>
                  change.kind === "folder" && change.id === item.ref.id && change.from !== null
              ).length
            : item.changes.filter((change) => change.published && change.from !== null).length),
        0
      )
    : 0;
  const orderKeys = Object.fromEntries(items.map((item) => [itemKey(item.ref), item.orderKey]));

  const preview: MovePreview = {
    blocked,
    droppedItems,
    foldersRewritten: items
      .filter((item) => item.kind === "folder" && item.parentChanges)
      .reduce((sum, item) => sum + 1 + (item.folder?.subtree?.descendants.length ?? 0), 0),
    mirrorRowsToWrite: options.redirects.mirrorToRedirectsPlugin ? publishedChanges.length : 0,
    ok: true,
    orderKeys,
    redirectRowsToWrite,
    samples,
    targetFolderId: targetId,
    urlChanges,
    warnings,
  };

  return {
    insertPlan,
    items,
    lockOwnerId: lockSourceOf(target),
    preview,
    redirects,
    target,
  };
};

/**
 * Spec section 5.4 as a preview, without writing: what a move would do, and what blocks it. Reads
 * the options the folders plugin was configured with on `req.payload`.
 */
export const planMove = async (
  req: PayloadRequest,
  request: MoveRequest,
  settings: PlanSettings = {}
): Promise<MovePreview> =>
  (await buildMovePlan(req, getResolvedOptions(req.payload), request, settings)).preview;
