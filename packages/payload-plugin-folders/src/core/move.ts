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
import { canReadItem, findUnreadableItems, isPublishRefusedBeneath } from "./access.js";
import { checkAllowedTypes, describeAllowedTypes, lockSourceOf } from "./allowedTypes.js";
import {
  normalizeFolderReference,
  planFolderPaths,
  toFolderRecord,
  wouldCreateCycle,
} from "./folderRecords.js";
import type { FolderRecord } from "./folderRecords.js";
import {
  getDefaultLocaleKey,
  getFallbackLocaleKey,
  getFolderLocaleKeys,
  noLocaleKey,
  toLocaleOrNull,
} from "./locales.js";
import {
  findForbiddenMoves,
  findItemsRefusedUpdate,
  forbiddenMoveMessage,
  forbiddenPublishMessage,
  publishKeyOf,
} from "./moveAccess.js";
import { countMirrorRows } from "./mirror.js";
import { planKeysForInsert } from "./orderKeys.js";
import { redirectRowsOfMovedItem } from "./redirects.js";
import type { InsertPlan } from "./orderKeys.js";
import { effectiveSegmentsOf, isPublishedInLocale, readPageRows } from "./pageRecords.js";
import type { PageRow } from "./pageRecords.js";
import { pagePathIn } from "./pagePaths.js";
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
  createConflictNamer,
  describeHiddenRootPageConflict,
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
import { itemKey } from "./itemKey.js";
import { badRequest } from "./badRequest.js";

/** What the caller saw when it built the request; a mismatch means the tree moved on (spec section 6). */
export type ExpectedState = { orderKey: string | null; parentId: FolderId | null };

/**
 * The sibling a move lands after. `expected.parentId` is the folder the caller saw the sibling in:
 * when the sibling is somewhere else by the time the move runs, the move is refused as stale
 * instead of landing next to the sibling in its new folder. Omitted, nothing is compared.
 */
export type MoveAnchor = ItemRef & { expected?: Pick<ExpectedState, "parentId"> };

export type MoveTarget =
  | { after?: undefined; position?: "end" | "start"; toFolder: FolderId | null }
  | { after: MoveAnchor; position?: undefined; toFolder?: undefined };

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

const idsOfAncestors = (ancestorIds: string | null): string[] =>
  (ancestorIds ?? "").split("/").filter((id) => id !== "");

const sameParent = (left: FolderId | null, right: FolderId | null): boolean =>
  String(left ?? null) === String(right ?? null);

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

  return {
    publishedChanges: pageChanges.filter((change) => change.published),
    urlChanges: { draftOnly, published: publishedIds.size, publishedAcrossLocales },
  };
};

/**
 * The first few URL changes of a preview, as examples: published pages first. The changes read at
 * database level, which checks no access, so a page the user of `req` may not read is left out of
 * the examples (its path and id would tell them it exists). Only the first candidates are asked
 * about, the way the delete preview picks its sample.
 */
export const pickSamples = async ({
  changes,
  overrideAccess,
  req,
}: {
  changes: PathChange[];
  overrideAccess: boolean;
  req: PayloadRequest;
}): Promise<MovePreview["samples"]> => {
  const pageChanges = changes.filter((change) => change.kind === "page");
  const candidates = [
    ...pageChanges.filter((change) => change.published),
    ...pageChanges.filter((change) => !change.published),
  ]
    .filter(
      (change): change is PathChange & { from: string; to: string } =>
        change.from !== null && change.to !== null
    )
    .slice(0, sampleLimit * 4);
  const hidden = new Set(
    overrideAccess
      ? []
      : (
          await findUnreadableItems({
            items: candidates.map((change) => ({ collection: change.collection, id: change.id })),
            req,
          })
        ).map((item) => itemKey(item))
  );

  return candidates
    .filter((change) => !hidden.has(itemKey(change)))
    .slice(0, sampleLimit)
    .map((change) => ({
      collection: change.collection,
      from: change.from,
      id: change.id,
      locale: change.locale,
      to: change.to,
    }));
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

/** What every step of `buildMovePlan` shares before the target is known. */
type PlanContext = {
  blocked: MoveBlock[];
  blockedKeys: Set<string>;
  defaultFolderKey: string;
  fallbackKey: string | null;
  firstRef: ItemRef;
  folderKeys: string[];
  foldersSlug: string;
  options: ResolvedOptions;
  overrideAccess: boolean;
  pageDefaultLocale: string;
  pageKeys: string[];
  redirects: boolean;
  req: PayloadRequest;
  request: MoveRequest;
  warnings: MoveWarning[];
};

/** The shared context once the moved rows and the target are read. */
type MoveContext = PlanContext & {
  descendantsByFolder: Map<string, FolderRecord[]>;
  droppedItems: ItemRef[];
  kept: Subject[];
  parentRecords: Map<string, FolderRecord>;
  target: FolderRecord | null;
  targetId: FolderId | null;
  targetPath: string;
};

type ResolvedTarget = { target: FolderRecord | null; targetId: FolderId | null };

const hasAnchor = (request: MoveRequest): boolean =>
  request.after !== undefined && request.after !== null;

const assertWellFormedRequest = (request: MoveRequest, options: ResolvedOptions): void => {
  if (request.items.length === 0) {
    throw badRequest("Choose at least one item to move");
  }
  const hasToFolder = request.toFolder !== undefined;
  if (hasAnchor(request) === hasToFolder) {
    throw badRequest("Name the target with either `toFolder` or `after`");
  }
  if (hasToFolder && normalizeFolderReference(request.toFolder).invalid) {
    throw badRequest("Use null for the top level of the tree: 0 is not a folder");
  }
  for (const item of request.items) {
    if (item.collection !== options.folders.slug && !options.collections[item.collection]) {
      throw badRequest(`"${item.collection}" is not a folder or a page collection of the tree`);
    }
  }
};

const createPlanContext = (
  req: PayloadRequest,
  options: ResolvedOptions,
  request: MoveRequest,
  overrideAccess: boolean
): PlanContext => {
  const { payload } = req;
  const [firstRequested] = request.items;

  return {
    blocked: [],
    blockedKeys: new Set(),
    defaultFolderKey: getDefaultLocaleKey(payload, options),
    fallbackKey: getFallbackLocaleKey(payload),
    firstRef: { collection: firstRequested.collection, id: firstRequested.id },
    folderKeys: getFolderLocaleKeys(payload, options),
    foldersSlug: options.folders.slug,
    options,
    overrideAccess,
    pageDefaultLocale: getPageDefaultLocale(payload),
    pageKeys: getPageLocaleKeys(payload),
    redirects: request.redirects ?? options.redirects.enabled,
    req,
    request,
    warnings: [],
  };
};

const block = (
  context: PlanContext,
  item: ItemRef,
  reason: MoveBlockReason,
  message: string,
  locale?: string | null
): void => {
  context.blocked.push({ item, message, reason, ...(locale === undefined ? {} : { locale }) });
  context.blockedKeys.add(itemKey(item));
};

const finishPlan = (
  context: PlanContext,
  targetId: FolderId | null,
  target: FolderRecord | null,
  preview: Partial<MovePreview> = {}
): MovePlan => {
  const { blocked, warnings } = context;

  return {
    insertPlan: null,
    items: [],
    lockOwnerId: null,
    preview: {
      blocked,
      droppedItems: [],
      foldersRewritten: 0,
      mirrorRowsToWrite: 0,
      ok: blocked.length === 0,
      orderKeys: {},
      redirectRowsToWrite: 0,
      samples: [],
      targetFolderId: targetId,
      urlChanges: { draftOnly: 0, published: 0, publishedAcrossLocales: 0 },
      warnings,
      ...preview,
    },
    redirects: context.redirects,
    target,
  };
};

const refuseMove = (context: MoveContext): MovePlan =>
  finishPlan(context, context.targetId, context.target, { droppedItems: context.droppedItems });

const refuseOversizedRequest = (context: PlanContext): MovePlan | null => {
  const { items } = context.request;
  const { maxItemsPerOperation } = context.options.limits;
  if (items.length <= maxItemsPerOperation) {
    return null;
  }
  const over = items[maxItemsPerOperation];
  block(
    context,
    { collection: over.collection, id: over.id },
    "size",
    `Move at most ${maxItemsPerOperation} items at once`
  );

  return finishPlan(context, null, null);
};

/** The same item named twice moves once, at the position of its first mention. */
const dropRepeatedItems = (items: MoveItemInput[]): MoveItemInput[] =>
  items.filter(
    (item, index) =>
      items.findIndex(
        (other) => other.collection === item.collection && String(other.id) === String(item.id)
      ) === index
  );

const readSubjects = async (
  context: PlanContext,
  requested: MoveItemInput[]
): Promise<{ folderRecords: Map<string, FolderRecord>; subjects: Subject[] }> => {
  const { foldersSlug, options, overrideAccess, req } = context;
  // `readFolderRecords` and `readPageRows` read at database level, which checks no access. An item
  // the user cannot read is left out of what they read, so it is answered like one that does not
  // exist: a move cannot be used to learn that a hidden page is there or which URL it has. A call
  // with no user at all is server code (the endpoints refuse an anonymous request before any
  // planning), and gets the plain refusal from the access check below.
  const hiddenKeys = new Set(
    overrideAccess || !req.user
      ? []
      : (
          await findUnreadableItems({
            items: requested.map((item) => ({ collection: item.collection, id: item.id })),
            req,
          })
        ).map((item) => itemKey(item))
  );
  const readable = requested.filter((item) => !hiddenKeys.has(itemKey(item)));

  const subjects: Subject[] = [];
  const folderRecords = await readFolderRecords(
    req,
    options,
    readable.filter((item) => item.collection === foldersSlug).map((item) => item.id)
  );
  const pageRowsByCollection = new Map<string, Map<string, PageRow>>();
  for (const page of Object.values(options.collections)) {
    pageRowsByCollection.set(
      page.slug,
      await readPageRows(
        req,
        page,
        readable.filter((item) => item.collection === page.slug).map((item) => item.id)
      )
    );
  }
  for (const item of requested) {
    const ref: ItemRef = { collection: item.collection, id: item.id };
    if (item.collection === foldersSlug) {
      const folder = folderRecords.get(String(item.id));
      if (!folder) {
        block(context, ref, "stale", `${staleMessage} A selected folder no longer exists.`);
        continue;
      }
      subjects.push({
        expected: item.expected,
        folder,
        kind: "folder",
        page: null,
        parentId: folder.parent,
        ref: { collection: item.collection, id: folder.id },
        row: null,
      });
      continue;
    }
    const row = pageRowsByCollection.get(item.collection)?.get(String(item.id));
    if (!row) {
      block(context, ref, "stale", `${staleMessage} A selected page no longer exists.`);
      continue;
    }
    subjects.push({
      expected: item.expected,
      folder: null,
      kind: "page",
      page: options.collections[item.collection],
      parentId: row.folder,
      ref,
      row,
    });
  }

  return { folderRecords, subjects };
};

/** The parents of the selected pages: their paths, and their ancestry for the selection rule. */
const readParentRecords = async (
  context: PlanContext,
  folderRecords: Map<string, FolderRecord>,
  subjects: Subject[]
): Promise<Map<string, FolderRecord>> => {
  const parentRecords = new Map<string, FolderRecord>(folderRecords);
  const missingParentIds = subjects
    .filter((subject) => subject.kind === "page" && subject.parentId !== null)
    .map((subject) => subject.parentId as FolderId)
    .filter((id) => !parentRecords.has(String(id)));
  for (const [id, record] of await readFolderRecords(
    context.req,
    context.options,
    missingParentIds
  )) {
    parentRecords.set(id, record);
  }

  return parentRecords;
};

/**
 * The folder the items land in: the one named by `toFolder`, or the parent of the sibling they go
 * after. `undefined` means the sibling cannot be found, `null` the top level.
 */
const readAnchorParent = async (
  context: PlanContext,
  after: MoveAnchor
): Promise<FolderId | null | undefined> => {
  const { foldersSlug, options, overrideAccess, req } = context;
  // An anchor the user cannot read is answered like one that does not exist, so a move cannot be
  // used to learn which folder a page or folder the user may not see sits in.
  const isAnchorReadable =
    overrideAccess ||
    (await canReadItem({ item: { collection: after.collection, id: after.id }, req }));
  if (!isAnchorReadable) {
    return undefined;
  }
  if (after.collection === foldersSlug) {
    return (await readFolderRecords(req, options, [after.id])).get(String(after.id))?.parent;
  }

  return (await readPageRows(req, options.collections[after.collection], [after.id])).get(
    String(after.id)
  )?.folder;
};

const resolveTargetId = async (
  context: PlanContext,
  requested: MoveItemInput[]
): Promise<{ targetId: FolderId | null } | null> => {
  const { foldersSlug, options, request } = context;
  if (!hasAnchor(request) || !request.after) {
    return { targetId: request.toFolder ?? null };
  }
  const { after } = request;
  if (requested.some((item) => itemKey(item) === itemKey(after))) {
    throw badRequest("The item to place the selection after cannot be part of the selection");
  }
  if (after.collection !== foldersSlug && !options.collections[after.collection]) {
    throw badRequest(`"${after.collection}" is not a folder or a page collection of the tree`);
  }
  const afterParent = await readAnchorParent(context, after);
  if (afterParent === undefined) {
    block(
      context,
      context.firstRef,
      "stale",
      `${staleMessage} The item to place the selection after no longer exists.`
    );

    return null;
  }
  // The caller chose this place because of where the sibling was; a sibling that moved on
  // would drop the items into a folder the caller never looked at.
  if (after.expected && !sameParent(after.expected.parentId, afterParent)) {
    block(
      context,
      context.firstRef,
      "stale",
      `${staleMessage} The item to place the selection after moved.`
    );

    return null;
  }

  return { targetId: afterParent };
};

const resolveTarget = async (
  context: PlanContext,
  requested: MoveItemInput[],
  parentRecords: Map<string, FolderRecord>
): Promise<ResolvedTarget | null> => {
  const resolved = await resolveTargetId(context, requested);
  if (resolved === null) {
    return null;
  }
  const { targetId } = resolved;
  if (targetId === null) {
    return { target: null, targetId: null };
  }
  const target =
    parentRecords.get(String(targetId)) ??
    (await readFolderRecords(context.req, context.options, [targetId])).get(String(targetId)) ??
    null;
  if (!target) {
    block(
      context,
      context.firstRef,
      "stale",
      `${staleMessage} The target folder no longer exists.`
    );

    return null;
  }

  return { target, targetId: target.id };
};

/** An item whose folder, or any folder above it, is selected moves with that folder. */
const splitDroppedItems = (
  subjects: Subject[],
  parentRecords: Map<string, FolderRecord>
): { droppedItems: ItemRef[]; kept: Subject[] } => {
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

  return { droppedItems, kept };
};

const liveSubjects = (context: MoveContext): Subject[] =>
  context.kept.filter((subject) => !context.blockedKeys.has(itemKey(subject.ref)));

const labelOf = async (context: MoveContext, subject: Subject): Promise<string> => {
  if (subject.kind === "folder" && subject.folder) {
    return (
      subject.folder.name[context.defaultFolderKey] ||
      subject.folder.fullPath[context.defaultFolderKey] ||
      `Folder ${subject.ref.id}`
    );
  }

  return subject.page
    ? readTitle(context.req, subject.page, subject.ref.id, context.pageDefaultLocale)
    : "";
};

const changesParent = (context: MoveContext, subject: Subject): boolean =>
  !sameParent(subject.parentId, context.targetId);

/** Segments of a moved item in each locale it is read in: folders per folder locale slot, pages per page locale. */
const segmentsOf = (
  context: MoveContext,
  subject: Subject
): Array<{ key: string; segment: string }> => {
  const { defaultFolderKey, folderKeys, pageDefaultLocale, pageKeys } = context;
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

const blockStaleItems = (context: MoveContext): void => {
  for (const subject of context.kept) {
    const { expected } = subject;
    if (!expected) {
      continue;
    }
    const storedKey = subject.kind === "folder" ? subject.folder?.orderKey : subject.row?.orderKey;
    if (
      !sameParent(expected.parentId, subject.parentId) ||
      (expected.orderKey ?? null) !== (storedKey ?? null)
    ) {
      block(context, subject.ref, "stale", staleMessage);
    }
  }
};

const changesLiveUrl = (context: MoveContext, subject: Subject): boolean => {
  const { page, row } = subject;
  if (subject.kind !== "page" || !page || !row || !changesParent(context, subject)) {
    return false;
  }
  const isDraftsCollection = Boolean(
    context.req.payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts
  );

  return context.pageKeys.some((key) =>
    isPublishedInLocale(row.status, key, isDraftsCollection, context.fallbackKey)
  );
};

/**
 * May the user put each item into this folder at all? It runs before any check that reads the
 * target's content, so a refused user is told "forbidden" and not that a path inside a folder they
 * may not enter is taken. The publish question of a page whose live URL changes is part of this
 * pass: it is known from the page's row (its folder and its status), and a refusal must not wait
 * behind a conflict message that names another page.
 */
const blockItemsRefusedUpdate = async (context: MoveContext): Promise<void> => {
  if (context.overrideAccess) {
    return;
  }
  const refusedUpdates = await findItemsRefusedUpdate({
    items: liveSubjects(context).map((subject) => ({
      changesLiveUrl: changesLiveUrl(context, subject),
      kind: subject.kind,
      ref: subject.ref,
    })),
    req: context.req,
    targetId: context.targetId,
  });
  for (const subject of liveSubjects(context)) {
    if (refusedUpdates.has(itemKey(subject.ref))) {
      block(context, subject.ref, "forbidden", forbiddenMoveMessage);
    } else if (refusedUpdates.has(publishKeyOf(subject.ref))) {
      block(context, subject.ref, "forbidden", forbiddenPublishMessage);
    }
  }
};

const blockCycles = (context: MoveContext): void => {
  const { target } = context;
  for (const subject of liveSubjects(context)) {
    if (
      subject.kind === "folder" &&
      subject.folder &&
      target &&
      wouldCreateCycle(subject.ref.id, target)
    ) {
      block(context, subject.ref, "cycle", cycleMessage);
    }
  }
};

/** Folder rows rewritten are counted before the subtrees are read, so an oversized move never reads them. */
const readMovedSubtrees = async (context: MoveContext): Promise<void> => {
  const { descendantsByFolder, options, req } = context;
  let foldersRewritten = 0;
  for (const subject of liveSubjects(context)) {
    if (subject.kind !== "folder" || !changesParent(context, subject)) {
      continue;
    }
    const { totalDocs } = await req.payload.db.count({
      collection: toCollectionSlug(options.folders.slug),
      req,
      where: { ancestorIds: { contains: `/${subject.ref.id}/` } },
    });
    foldersRewritten += totalDocs + 1;
    if (foldersRewritten > options.limits.maxFoldersPerMove) {
      block(
        context,
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
};

/**
 * A moved folder changes the live URL of every published page beneath it, so it needs the publish
 * rights a move of those pages would. The question is asked before any type or conflict check,
 * for the same reason as the page's above.
 */
const blockFoldersRefusedPublish = async (context: MoveContext): Promise<void> => {
  if (context.overrideAccess) {
    return;
  }
  for (const subject of liveSubjects(context)) {
    const descendants = context.descendantsByFolder.get(String(subject.ref.id));
    if (subject.kind !== "folder" || !subject.folder || !descendants) {
      continue;
    }
    if (
      await isPublishRefusedBeneath({
        folderIds: [subject.folder.id, ...descendants.map((folder) => folder.id)],
        options: context.options,
        req: context.req,
      })
    ) {
      block(context, subject.ref, "forbidden", forbiddenPublishMessage);
    }
  }
};

/** The deepest path the moved subtree reaches after the move, or `null` when the item has no rows to measure. */
const deepestPathAfterMove = async (
  context: MoveContext,
  subject: Subject
): Promise<number | null> => {
  const { defaultFolderKey, descendantsByFolder, options, req, target } = context;
  if (subject.kind === "page" && subject.row) {
    return pageDepthIn(target, subject.row.isFolderRoot);
  }
  if (!subject.folder) {
    return null;
  }
  const descendants = descendantsByFolder.get(String(subject.ref.id)) ?? [];
  const ownDepth = folderDepthOf(subject.folder, defaultFolderKey);
  const newDepth = (target ? folderDepthOf(target, defaultFolderKey) : 0) + 1;
  const shift = newDepth - ownDepth;
  const deepestFolder = Math.max(
    newDepth,
    ...descendants.map((folder) => folderDepthOf(folder, defaultFolderKey) + shift)
  );
  if (deepestFolder !== options.maxDepth) {
    return deepestFolder;
  }
  // A page that is not a root page sits one level below its folder.
  const deepestIds = [subject.folder, ...descendants]
    .filter((folder) => folderDepthOf(folder, defaultFolderKey) + shift === deepestFolder)
    .map((folder) => folder.id);
  for (const page of Object.values(options.collections)) {
    const { totalDocs } = await req.payload.db.count({
      collection: toCollectionSlug(page.slug),
      req,
      where: {
        and: [{ folder: { in: deepestIds } }, { isFolderRoot: { not_equals: true } }],
      },
    });
    if (totalDocs > 0) {
      return deepestFolder + 1;
    }
  }

  return deepestFolder;
};

const blockTooDeep = async (context: MoveContext): Promise<void> => {
  for (const subject of liveSubjects(context)) {
    if (!changesParent(context, subject)) {
      continue;
    }
    const deepest = await deepestPathAfterMove(context, subject);
    if (deepest !== null && deepest > context.options.maxDepth) {
      block(
        context,
        subject.ref,
        "depth",
        `This would make URLs ${deepest} segments deep; the limit is ${context.options.maxDepth}`
      );
    }
  }
};

/**
 * Segments the site root cannot take: the ones the site itself uses, and the ones with a dot, so
 * robots.txt and sitemap.xml stay the frontend's. A legacy segment that fails the segment pattern
 * (`About`) is accepted until it is edited (spec section 2.6), so it may move back to the root.
 */
const blockReservedRootSegments = (context: MoveContext): void => {
  if (context.target !== null) {
    return;
  }
  // Lowercased on both sides: a legacy `Admin` is still the site's `/admin` (decision 22).
  const reservedRootSegments = new Set(
    context.options.reservedRootSegments.map((segment) => segment.toLowerCase())
  );
  for (const subject of liveSubjects(context)) {
    if (!changesParent(context, subject) || isRootPage(subject)) {
      continue;
    }
    for (const { segment } of segmentsOf(context, subject)) {
      if (segment === "") {
        continue;
      }
      if (reservedRootSegments.has(segment.toLowerCase())) {
        block(context, subject.ref, "reserved", `/${segment} is used by the site itself`);
        break;
      }
      if (segment.includes(".")) {
        block(
          context,
          subject.ref,
          "reserved",
          `/${segment} cannot be at the top level: a top-level segment cannot contain a dot`
        );
        break;
      }
    }
  }
};

/** Pages that would land in a folder that refuses their type, including pages inside a moved folder. */
const checkTypesAllowedInTarget = async (context: MoveContext): Promise<void> => {
  const { options, req, target, targetId, targetPath, warnings } = context;
  const typeSubjects = liveSubjects(context).filter((subject) => changesParent(context, subject));
  const typeCheck = await checkAllowedTypes(
    targetId,
    typeSubjects.map((subject) => subject.ref),
    { options, req }
  );
  if (typeCheck.isAllowed || !target) {
    return;
  }
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
      block(context, subject.ref, "type", message);
    } else {
      warnings.push({ item: subject.ref, message, reason: "type" });
    }
  }
};

/** What the items checked so far have claimed in the target, so two moved items cannot take one path. */
type PathClaims = {
  claimedRootPage: Subject | null;
  claimedSegments: Map<string, Subject>;
  nameConflictingPage: ReturnType<typeof createConflictNamer>;
  storedConflicts: Map<string, Map<string, SegmentConflict>>;
};

/** The stored rows are read once per locale for every segment that moves, not once per item. */
const readStoredConflicts = async (
  context: MoveContext
): Promise<Map<string, Map<string, SegmentConflict>>> => {
  const segmentsByKey = new Map<string, Set<string>>();
  for (const subject of liveSubjects(context)) {
    if (!changesParent(context, subject) || isRootPage(subject)) {
      continue;
    }
    for (const { key, segment } of segmentsOf(context, subject)) {
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
        folder: context.target,
        locale: key,
        options: context.options,
        publishedOnly: true,
        req: context.req,
        segments: [...segments],
      })
    );
  }

  return storedConflicts;
};

const blockRootPageConflict = async (
  context: MoveContext,
  subject: Subject,
  claims: PathClaims,
  targetLabel: string
): Promise<void> => {
  const { options, overrideAccess, req, target, targetPath } = context;
  if (claims.claimedRootPage !== null) {
    block(
      context,
      subject.ref,
      "rootPage",
      `"${await labelOf(context, subject)}" cannot move to ${targetLabel}: ${await labelOf(context, claims.claimedRootPage)} is already moving there as its root page`
    );

    return;
  }
  const conflict = await findRootPageConflict({
    folder: target,
    options,
    req,
    self: { collection: subject.ref.collection, id: subject.ref.id },
  });
  if (conflict) {
    const folderPath = target ? targetPath : "/";
    const isNamed =
      overrideAccess ||
      (await canReadItem({ item: { collection: conflict.collection, id: conflict.id }, req }));
    block(
      context,
      subject.ref,
      "rootPage",
      `"${await labelOf(context, subject)}" cannot move to ${targetLabel}: ${isNamed ? describeRootPageConflict(conflict, folderPath) : describeHiddenRootPageConflict(folderPath)}`
    );

    return;
  }
  claims.claimedRootPage = subject;
};

const blockSegmentConflict = async (
  context: MoveContext,
  subject: Subject,
  claims: PathClaims,
  targetLabel: string
): Promise<void> => {
  const { options, overrideAccess, req, target } = context;
  const checked = new Set<string>();
  for (const { key, segment } of segmentsOf(context, subject)) {
    const claimKey = `${key}\u0000${segment}`;
    if (segment === "" || checked.has(claimKey)) {
      continue;
    }
    checked.add(claimKey);
    const localeSuffix = key === noLocaleKey ? "" : ` in ${key}`;
    const path = joinPath(target ? folderPathIn(target, key, options, req.payload) : "", segment);
    const claimedBy = claims.claimedSegments.get(claimKey);
    if (claimedBy !== undefined) {
      block(
        context,
        subject.ref,
        "conflict",
        `"${await labelOf(context, subject)}" cannot move to ${targetLabel}: ${path} is already used by ${await labelOf(context, claimedBy)}${localeSuffix}`,
        toLocaleOrNull(key)
      );

      return;
    }
    const conflict = claims.storedConflicts.get(key)?.get(segment);
    if (conflict) {
      let other = "a folder";
      if (conflict.kind === "page") {
        other = overrideAccess ? conflict.title : await claims.nameConflictingPage(conflict);
      }
      block(
        context,
        subject.ref,
        "conflict",
        `"${await labelOf(context, subject)}" cannot move to ${targetLabel}: ${conflict.path} is already used by ${other}${localeSuffix}`,
        toLocaleOrNull(key)
      );

      return;
    }
    claims.claimedSegments.set(claimKey, subject);
  }
};

/** Conflicts in every locale against the stored rows, root pages, and the moved items against each other. */
const blockPathConflicts = async (context: MoveContext): Promise<void> => {
  const claims: PathClaims = {
    claimedRootPage: null,
    claimedSegments: new Map(),
    nameConflictingPage: createConflictNamer(context.req),
    storedConflicts: await readStoredConflicts(context),
  };
  const targetLabel = context.target ? context.targetPath : "the top level";
  for (const subject of liveSubjects(context)) {
    if (!changesParent(context, subject)) {
      continue;
    }
    if (isRootPage(subject)) {
      await blockRootPageConflict(context, subject, claims, targetLabel);
    } else {
      await blockSegmentConflict(context, subject, claims, targetLabel);
    }
  }
};

const planOrderKeys = (context: MoveContext, moving: Subject[]): Promise<InsertPlan> => {
  const { request, targetId } = context;
  let at: "end" | "start" | { after: ItemRef } = request.position === "end" ? "end" : "start";
  if (hasAnchor(request) && request.after) {
    at = { after: request.after };
  }

  return planKeysForInsert(context.req, context.options, {
    at,
    count: moving.length,
    exclude: moving.map((subject) => subject.ref),
    parent: targetId,
  });
};

const planPageItem = (
  context: MoveContext,
  subject: Subject & { page: ResolvedPageCollection; row: PageRow },
  orderKey: string,
  parentChanges: boolean
): PlannedMoveItem => {
  const { fallbackKey, options, pageDefaultLocale, pageKeys, parentRecords, req, target } = context;
  const { row, page } = subject;
  const changes: PathChange[] = [];
  if (parentChanges) {
    const hasDrafts = Boolean(
      req.payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts
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
        payload: req.payload,
        segment: effective[key],
      });
      const to = pagePathIn({
        folder: target,
        isFolderRoot: row.isFolderRoot,
        key,
        options,
        payload: req.payload,
        segment: effective[key],
      });
      if (from !== to) {
        changes.push({
          collection: page.slug,
          from,
          id: subject.ref.id,
          kind: "page",
          locale: toLocaleOrNull(key),
          published: isPublishedInLocale(row.status, key, hasDrafts, fallbackKey),
          to,
        });
      }
    }
  }

  return {
    changes,
    folder: null,
    kind: "page",
    orderKey,
    page,
    parentChanges,
    ref: subject.ref,
    structureRevision: row.structureRevision + 1,
  };
};

const planFolderItem = async (
  context: MoveContext,
  subject: Subject & { folder: FolderRecord },
  orderKey: string,
  parentChanges: boolean
): Promise<PlannedMoveItem> => {
  const { defaultFolderKey, descendantsByFolder, folderKeys, options, req, target, targetId } =
    context;
  const previous = subject.folder;
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
  const changes: PathChange[] = [];
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

  return {
    changes,
    folder: { current, previous, subtree },
    kind: "folder",
    orderKey,
    page: null,
    parentChanges,
    ref: subject.ref,
    structureRevision,
  };
};

const planMovedItems = async (
  context: MoveContext,
  moving: Subject[],
  insertPlan: InsertPlan
): Promise<PlannedMoveItem[]> => {
  const items: PlannedMoveItem[] = [];
  for (const [index, subject] of moving.entries()) {
    const orderKey = insertPlan.keys[index];
    const parentChanges = changesParent(context, subject);
    if (subject.kind === "page" && subject.row && subject.page) {
      items.push(
        planPageItem(
          context,
          { ...subject, page: subject.page, row: subject.row },
          orderKey,
          parentChanges
        )
      );
    } else {
      items.push(
        await planFolderItem(
          context,
          { ...subject, folder: subject.folder as FolderRecord },
          orderKey,
          parentChanges
        )
      );
    }
  }

  return items;
};

/** Whether the planned items were refused; the refusals are added to the blocked list. */
const blockForbiddenMoves = async (
  context: MoveContext,
  items: PlannedMoveItem[]
): Promise<boolean> => {
  if (context.overrideAccess) {
    return false;
  }
  const forbidden = await findForbiddenMoves({
    items,
    options: context.options,
    req: context.req,
    targetId: context.targetId,
  });
  for (const refusal of forbidden) {
    context.blocked.push(refusal);
    context.blockedKeys.add(itemKey(refusal.item));
  }

  return forbidden.length > 0;
};

const buildPreview = async (
  context: MoveContext,
  items: PlannedMoveItem[]
): Promise<MovePreview> => {
  const { options, overrideAccess, redirects, req } = context;
  const allChanges = items.flatMap((item) => item.changes);
  const { urlChanges } = summarizePageChanges(allChanges);
  const samples = await pickSamples({ changes: allChanges, overrideAccess, req });
  const redirectRowsToWrite = redirects
    ? items.reduce((sum, item) => sum + redirectRowsOfMovedItem(item).length, 0)
    : 0;
  const orderKeys = Object.fromEntries(items.map((item) => [itemKey(item.ref), item.orderKey]));

  return {
    blocked: context.blocked,
    droppedItems: context.droppedItems,
    foldersRewritten: items
      .filter((item) => item.kind === "folder" && item.parentChanges)
      .reduce((sum, item) => sum + 1 + (item.folder?.subtree?.descendants.length ?? 0), 0),
    mirrorRowsToWrite: redirects ? countMirrorRows(allChanges, options, req.payload) : 0,
    ok: true,
    orderKeys,
    redirectRowsToWrite,
    samples,
    targetFolderId: context.targetId,
    urlChanges,
    warnings: context.warnings,
  };
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
  assertWellFormedRequest(request, options);
  const planContext = createPlanContext(req, options, request, overrideAccess);

  const oversized = refuseOversizedRequest(planContext);
  if (oversized) {
    return oversized;
  }

  const requested = dropRepeatedItems(request.items);
  const { folderRecords, subjects } = await readSubjects(planContext, requested);
  const parentRecords = await readParentRecords(planContext, folderRecords, subjects);
  const resolvedTarget = await resolveTarget(planContext, requested, parentRecords);
  if (resolvedTarget === null) {
    return finishPlan(planContext, null, null);
  }
  const { target, targetId } = resolvedTarget;
  const { droppedItems, kept } = splitDroppedItems(subjects, parentRecords);
  const context: MoveContext = {
    ...planContext,
    descendantsByFolder: new Map(),
    droppedItems,
    kept,
    parentRecords,
    target,
    targetId,
    targetPath: target
      ? target.fullPath[planContext.defaultFolderKey] || "the target folder"
      : "the top level",
  };

  blockStaleItems(context);
  await blockItemsRefusedUpdate(context);
  blockCycles(context);
  await readMovedSubtrees(context);
  await blockFoldersRefusedPublish(context);
  await blockTooDeep(context);
  blockReservedRootSegments(context);
  await checkTypesAllowedInTarget(context);
  await blockPathConflicts(context);

  const moving = liveSubjects(context);
  if (context.blocked.length > 0 || moving.length === 0) {
    return refuseMove(context);
  }

  const insertPlan = await planOrderKeys(context, moving);
  const items = await planMovedItems(context, moving, insertPlan);
  if (await blockForbiddenMoves(context, items)) {
    return refuseMove(context);
  }

  return {
    insertPlan,
    items,
    lockOwnerId: lockSourceOf(target),
    preview: await buildPreview(context, items),
    redirects: context.redirects,
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
