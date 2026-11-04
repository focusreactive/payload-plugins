import { APIError, createPayloadRequest } from "payload";
import type { CreatePayloadRequestArgs, Payload, PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { withCopySuffix } from "../hooks/pages/beforeDuplicate.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { canCreateIn, findUnreadableItems } from "./access.js";
import { checkAllowedTypes, describeAllowedTypes, lockSourceOf } from "./allowedTypes.js";
import { normalizeFolderReference, readFolderRecord } from "./folderRecords.js";
import type { FolderRecord } from "./folderRecords.js";
import {
  getDefaultLocaleKey,
  getFolderLocaleKeys,
  getLocaleCodes,
  noLocaleKey,
  requestLocaleKey,
  withoutEmptyValues,
} from "./locales.js";
import type { ValuesByLocale } from "./locales.js";
import { createNestedRequest } from "./nestedRequest.js";
import { registerOperationHandler, runOrQueue } from "./operations.js";
import type { OperationHandler } from "./operations.js";
import { compareSiblings } from "./orderKeys.js";
import type { SiblingRow } from "./orderKeys.js";
import { isPublishedStatus } from "./pageRecords.js";
import { isStatusLocalized } from "./publishedWhere.js";
import { getResolvedOptions } from "./runtime.js";
import { itemKey } from "./itemKey.js";
import { readSelection } from "./selection.js";
import type { Selection } from "./selection.js";
import { SEGMENT_ERROR_MESSAGE, isValidSegment } from "./slugify.js";
import { findSegmentConflict, getPageLocaleKeys } from "./uniqueness.js";

export type DuplicateRequest = {
  items: ItemRef[];
  /** Name and URL segment of the copy, in the request's locale. For a single item only. */
  overrides?: { name?: string; slug?: string };
  /**
   * The folder the copies go to; `null` is the top level. Without it a single item is copied
   * beside the original, and several items are refused: they need a folder of their own.
   */
  toFolder?: FolderId | null;
};

export type DuplicateBlockReason =
  | "depth"
  | "forbidden"
  | "reserved"
  | "sameFolder"
  | "segment"
  | "size"
  | "stale"
  | "type";

const statusByReason: Record<DuplicateBlockReason, number> = {
  depth: 400,
  forbidden: 403,
  reserved: 400,
  sameFolder: 400,
  segment: 409,
  size: 400,
  stale: 409,
  type: 400,
};

/** A duplicate the checks of spec section 7.10 refused. Nothing was written. */
export class DuplicateBlockedError extends APIError<{
  /** Every item the refusal names, however many `items` lists. */
  count: number;
  /** The first 50 of them. */
  items: ItemRef[];
  reason: DuplicateBlockReason;
}> {
  constructor(reason: DuplicateBlockReason, message: string, items: ItemRef[] = []) {
    super(
      message,
      statusByReason[reason],
      { count: items.length, items: items.slice(0, 50), reason },
      true
    );
    this.name = "DuplicateBlockedError";
  }
}

const staleMessage = "This part of the tree changed. Reload and try again.";

/** One document to copy, in the order the step runs them: a folder always comes before its content. */
type DuplicateUnit =
  | { id: FolderId; kind: "folder"; parent: "target" | FolderId }
  | { collection: string; id: FolderId; kind: "page"; parent: "target" | FolderId };

export type DuplicatePlan = {
  /** Folders and pages the copy creates. */
  total: number;
  /** The folder every root copy goes into. */
  targetFolder: FolderId | null;
  units: DuplicateUnit[];
};

export type DuplicateResult =
  /** `copied` is every document the copy made (a folder's content included); `created` is its roots. */
  { copied: number; created: ItemRef[] } | { operationId: FolderId; total: number };

const sourceFolderOf = (
  selection: Selection,
  item: ItemRef,
  foldersSlug: string
): FolderId | null => {
  if (item.collection === foldersSlug) {
    return (
      selection.folders.find((folder) => String(folder.id) === String(item.id))?.parent ?? null
    );
  }

  return selection.pages.find((page) => itemKey(page) === itemKey(item))?.row.folder ?? null;
};

/**
 * Orders a root's subtree for copying: the folder, then its children one by one in reverse order,
 * folders and pages mixed by order key, because each copy lands on top of its folder and the first
 * child has to be the last one created to stay first.
 */
const unitsOfSubtree = (
  selection: Selection,
  options: ResolvedOptions,
  root: FolderRecord
): DuplicateUnit[] => {
  const siblingsByParent = new Map<string, Array<SiblingRow & { unit: DuplicateUnit }>>();
  const add = (parent: FolderId | null, row: SiblingRow & { unit: DuplicateUnit }) => {
    const key = String(parent);
    siblingsByParent.set(key, [...(siblingsByParent.get(key) ?? []), row]);
  };
  for (const folder of selection.folders) {
    if (folder.parent !== null) {
      add(folder.parent, {
        collection: options.folders.slug,
        createdAt: null,
        id: folder.id,
        kind: "folder",
        orderKey: folder.orderKey,
        unit: { id: folder.id, kind: "folder", parent: folder.parent },
      });
    }
  }
  for (const page of selection.pages) {
    if (page.row.folder !== null) {
      add(page.row.folder, {
        collection: page.collection,
        createdAt: page.createdAt,
        id: page.id,
        kind: "page",
        orderKey: page.row.orderKey,
        unit: { collection: page.collection, id: page.id, kind: "page", parent: page.row.folder },
      });
    }
  }

  const units: DuplicateUnit[] = [];
  const walk = (folderId: FolderId) => {
    const children = (siblingsByParent.get(String(folderId)) ?? []).sort(compareSiblings).reverse();
    for (const child of children) {
      units.push(child.unit);
      if (child.unit.kind === "folder") {
        walk(child.unit.id);
      }
    }
  };
  units.push({ id: root.id, kind: "folder", parent: "target" });
  walk(root.id);

  return units;
};

const segmentsOfFolder = (folder: FolderRecord): string[] => [
  ...new Set(Object.values(withoutEmptyValues(folder.slug))),
];

const describeDepth = (depth: number, maxDepth: number): string =>
  `This would make URLs ${depth} segments deep; the limit is ${maxDepth}`;

/**
 * Everything spec sections 7.10 and 9 ask before a copy, with nothing written: the items exist and
 * are readable, a bulk copy goes to another folder, the target exists, takes the page types, stays
 * within `maxDepth` and, at the top level, keeps off the segments the site uses, and the user may
 * create the documents the copy makes. Answers the ordered work list.
 */
export const planDuplicate = async (
  req: PayloadRequest,
  request: DuplicateRequest,
  {
    options = getResolvedOptions(req.payload),
    overrideAccess = false,
  }: { options?: ResolvedOptions; overrideAccess?: boolean } = {}
): Promise<DuplicatePlan> => {
  const { payload } = req;
  const foldersSlug = options.folders.slug;
  if (request.items.length === 0) {
    throw new APIError("Choose at least one item to copy", 400, null, true);
  }
  if (request.items.length > options.limits.maxItemsPerOperation) {
    throw new DuplicateBlockedError(
      "size",
      `Copy at most ${options.limits.maxItemsPerOperation} items at once`
    );
  }
  for (const item of request.items) {
    if (item.collection !== foldersSlug && !options.collections[item.collection]) {
      throw new APIError(
        `"${item.collection}" is not a folder or a page collection of the tree`,
        400,
        null,
        true
      );
    }
  }

  const selection = await readSelection(req, options, request.items);
  if (selection.missing.length > 0) {
    throw new DuplicateBlockedError("stale", staleMessage, selection.missing);
  }
  const { roots } = selection;
  const hasOverrides =
    request.overrides?.name !== undefined || request.overrides?.slug !== undefined;
  if (hasOverrides && roots.length !== 1) {
    throw new APIError(
      "A name and a URL segment can be chosen for a single item only",
      400,
      null,
      true
    );
  }

  // The target: a given folder, else beside the original. Several items need a folder given.
  let targetFolder: FolderId | null;
  if (request.toFolder === undefined) {
    if (roots.length !== 1) {
      throw new DuplicateBlockedError(
        "sameFolder",
        "Bulk copies need another folder, because their URL segments would clash"
      );
    }
    targetFolder = sourceFolderOf(selection, roots[0], foldersSlug);
  } else {
    targetFolder = request.toFolder;
  }
  if (roots.length > 1) {
    const inTarget = roots.filter(
      (root) => String(sourceFolderOf(selection, root, foldersSlug)) === String(targetFolder)
    );
    if (inTarget.length > 0) {
      throw new DuplicateBlockedError(
        "sameFolder",
        "Bulk copies need another folder, because their URL segments would clash",
        inTarget
      );
    }
  }

  const target = targetFolder === null ? null : await readFolderRecord(req, options, targetFolder);
  if (targetFolder !== null && (!target || target.storedRow.deletedAt)) {
    throw new DuplicateBlockedError("stale", `${staleMessage} The target folder no longer exists.`);
  }

  // Reading: one refused document refuses the copy, and answers like a missing one would not.
  if (!overrideAccess) {
    const unreadable = await findUnreadableItems({
      items: [
        ...selection.folders.map((folder) => ({ collection: foldersSlug, id: folder.id })),
        ...selection.pages.map((page) => ({ collection: page.collection, id: page.id })),
      ],
      req,
    });
    if (unreadable.length > 0) {
      throw new DuplicateBlockedError("forbidden", "You are not allowed to copy this", unreadable);
    }
  }

  const topFolders = roots.filter((root) => root.collection === foldersSlug);
  const rootRecords = topFolders.flatMap((root) => {
    const record = selection.folders.find((folder) => String(folder.id) === String(root.id));

    return record ? [record] : [];
  });

  if (rootRecords.length > 0 && selection.folders.length > options.limits.maxFoldersPerMove) {
    throw new DuplicateBlockedError(
      "size",
      `This would copy ${selection.folders.length} folders; the limit is ${options.limits.maxFoldersPerMove}`
    );
  }

  // Page types: everything that is copied has to be accepted by the target.
  const typeCheck = await checkAllowedTypes(targetFolder, roots, { options, req });
  if (!typeCheck.isAllowed && target) {
    throw new DuplicateBlockedError(
      "type",
      describeAllowedTypes(
        target.fullPath[getDefaultLocaleKey(payload, options)] || "The target folder",
        target.allowedTypes,
        options
      ),
      typeCheck.refusedItems.map((refused) => refused.item)
    );
  }

  // Depth: the deepest copied folder or page, below the target.
  const targetDepth = target?.depth ?? 0;
  let deepest = 0;
  for (const root of roots) {
    if (root.collection !== foldersSlug) {
      deepest = Math.max(deepest, targetDepth + 1);
    }
  }
  for (const rootRecord of rootRecords) {
    const baseDepth = rootRecord.depth ?? 0;
    for (const folder of selection.folders) {
      if (
        folder.id === rootRecord.id ||
        (folder.ancestorIds ?? "").includes(`/${rootRecord.id}/`)
      ) {
        deepest = Math.max(deepest, targetDepth + 1 + ((folder.depth ?? 0) - baseDepth));
      }
    }
    for (const page of selection.pages) {
      const parent = selection.folders.find(
        (folder) => String(folder.id) === String(page.row.folder)
      );
      if (
        parent &&
        (parent.id === rootRecord.id || (parent.ancestorIds ?? "").includes(`/${rootRecord.id}/`))
      ) {
        deepest = Math.max(deepest, targetDepth + 2 + ((parent.depth ?? 0) - baseDepth));
      }
    }
  }
  if (deepest > options.maxDepth) {
    throw new DuplicateBlockedError("depth", describeDepth(deepest, options.maxDepth));
  }

  // The top level: the segments the site itself uses, and the pattern (no dot at the root).
  if (targetFolder === null) {
    const requestedSlug = request.overrides?.slug;
    const hasReserved = (segment: string): boolean =>
      !isValidSegment(segment, { atSiteRoot: true }) ||
      options.reservedRootSegments.includes(segment.toLowerCase());
    const segments = [
      ...(requestedSlug === undefined ? [] : [requestedSlug]),
      ...rootRecords.flatMap((record) => segmentsOfFolder(record)),
      ...selection.pages
        .filter((page) => roots.some((root) => itemKey(root) === itemKey(page)))
        .flatMap((page) => {
          const own = page.row.segments;
          if (own && typeof own === "object") {
            return Object.values(own as Record<string, unknown>).filter(
              (value): value is string => typeof value === "string" && value !== ""
            );
          }

          return typeof own === "string" && own !== "" ? [own] : [];
        }),
    ];
    if (segments.some((segment) => hasReserved(segment))) {
      throw new DuplicateBlockedError(
        "reserved",
        "A copy at the top level would take a URL segment the site itself uses"
      );
    }
  }

  // A chosen segment has to be valid and free where the copy goes.
  if (request.overrides?.slug !== undefined) {
    const { slug } = request.overrides;
    if (!isValidSegment(slug, { atSiteRoot: targetFolder === null })) {
      throw new DuplicateBlockedError("segment", SEGMENT_ERROR_MESSAGE);
    }
    const key = requestLocaleKey(payload, options, req.locale);
    const conflict = await findSegmentConflict({
      folder: target,
      locale:
        key === "all" || key === noLocaleKey ? (getPageLocaleKeys(payload)[0] ?? noLocaleKey) : key,
      options,
      publishedOnly: false,
      req,
      segment: slug,
      self: null,
    });
    if (conflict) {
      throw new DuplicateBlockedError("segment", `${conflict.path} is already used`);
    }
  }

  // Creating: the user must be allowed to make what the copy makes.
  if (!overrideAccess) {
    const collections = new Set(selection.pages.map((page) => page.collection));
    // Keyed, because a top folder is named once for the folders and once for each page collection
    // that refuses, and a refusal counts it once.
    const refusedRoots = new Map<string, ItemRef>();
    const refuse = (refs: ItemRef[]) => {
      for (const ref of refs) {
        refusedRoots.set(itemKey(ref), ref);
      }
    };
    for (const collection of collections) {
      if (!(await canCreateIn({ collection, data: { folder: targetFolder }, req }))) {
        refuse([
          ...roots.filter((root) => root.collection === collection),
          ...topFolders.filter(() => collection !== foldersSlug),
        ]);
      }
    }
    if (
      selection.folders.length > 0 &&
      !(await canCreateIn({ collection: foldersSlug, data: { parent: targetFolder }, req }))
    ) {
      refuse(topFolders);
    }
    if (refusedRoots.size > 0) {
      throw new DuplicateBlockedError("forbidden", "You are not allowed to create copies here", [
        ...refusedRoots.values(),
      ]);
    }
  }

  // The work list: roots in reverse, so that the first one selected ends on top of the target.
  const units: DuplicateUnit[] = [];
  for (const root of [...roots].reverse()) {
    if (root.collection === foldersSlug) {
      const record = rootRecords.find((folder) => String(folder.id) === String(root.id));
      if (record) {
        units.push(...unitsOfSubtree(selection, options, record));
      }
    } else {
      units.push({ collection: root.collection, id: root.id, kind: "page", parent: "target" });
    }
  }

  return { targetFolder, total: units.length, units };
};

const hasLocalizedField = (payload: Payload, collection: string, field: string): boolean =>
  Boolean(
    payload.collections[toCollectionSlug(collection)]?.config.flattenedFields.some(
      (candidate) => candidate.name === field && candidate.localized
    )
  );

/**
 * The slugs a folder copy takes in each locale: its own, or with `-copy`, `-copy-2` and so on added
 * to all of them at the first attempt where none clashes in the target (a folder or a page of the
 * same segment, in any state). A chosen segment is kept as it is in the request's locale.
 */
const pickFolderSlugs = async ({
  chosen,
  isBesideSource,
  options,
  req,
  slugs,
  target,
}: {
  chosen: { key: string; slug: string } | null;
  /** The copy goes to the folder of the original, which always gets the `-copy` mark. */
  isBesideSource: boolean;
  options: ResolvedOptions;
  req: PayloadRequest;
  slugs: ValuesByLocale;
  target: FolderRecord | null;
}): Promise<Record<string, string>> => {
  const own = withoutEmptyValues(slugs);
  for (let attempt = isBesideSource ? 1 : 0; attempt <= 1000; attempt += 1) {
    const candidate: Record<string, string> = {};
    for (const [key, slug] of Object.entries(own)) {
      candidate[key] = chosen?.key === key ? chosen.slug : withCopySuffix(slug, attempt);
    }
    let isFree = true;
    for (const [key, slug] of Object.entries(candidate)) {
      const conflict = await findSegmentConflict({
        folder: target,
        locale: key,
        options,
        publishedOnly: false,
        req,
        segment: slug,
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

  return own;
};

const copyFolder = async ({
  isRoot,
  options,
  overrideAccess,
  overrides,
  parentId,
  req,
  source,
}: {
  isRoot: boolean;
  options: ResolvedOptions;
  overrideAccess: boolean;
  overrides: DuplicateRequest["overrides"] | undefined;
  parentId: FolderId | null;
  req: PayloadRequest;
  source: FolderRecord;
}): Promise<FolderId> => {
  const { payload } = req;
  const keys = getFolderLocaleKeys(payload, options);
  const isLocalized = !(keys.length === 1 && keys[0] === noLocaleKey);
  const writeKey = requestLocaleKey(payload, options, req.locale);
  const slotKey = isLocalized ? (writeKey === "all" ? keys[0] : writeKey) : noLocaleKey;
  const parent = parentId === null ? null : await readFolderRecord(req, options, parentId);

  const names: Record<string, string> = withoutEmptyValues(source.name);
  if (isRoot && overrides?.name !== undefined) {
    names[slotKey] = overrides.name;
  }
  const slugs = isRoot
    ? await pickFolderSlugs({
        chosen: overrides?.slug === undefined ? null : { key: slotKey, slug: overrides.slug },
        isBesideSource: String(parentId) === String(source.parent),
        options,
        req,
        slugs: source.slug,
        target: parent,
      })
    : withoutEmptyValues(source.slug);

  const isUnderLock = lockSourceOf(parent) !== null;
  const data: Record<string, unknown> = {
    name: isLocalized ? names : names[noLocaleKey],
    parent: parentId,
    slug: isLocalized ? slugs : slugs[noLocaleKey],
    ...(isUnderLock
      ? {}
      : {
          allowedTypes: source.allowedTypes,
          defaultType: source.defaultType,
          lockSubfolderTypes: source.lockSubfolderTypes,
        }),
  };
  // The folder collection's own hooks check the slug and the types, as for any create.
  const created = await payload.create({
    collection: toCollectionSlug(options.folders.slug),
    data: data as never,
    depth: 0,
    locale: (isLocalized ? "all" : undefined) as never,
    overrideAccess,
    req: createNestedRequest(req),
    select: { id: true } as never,
  });

  return (created as { id: FolderId }).id;
};

const copyPage = async ({
  collection,
  id,
  isBesideSource,
  isRoot,
  options,
  overrideAccess,
  overrides,
  parentId,
  req,
}: {
  collection: string;
  id: FolderId;
  isBesideSource: boolean;
  isRoot: boolean;
  options: ResolvedOptions;
  overrideAccess: boolean;
  overrides: DuplicateRequest["overrides"] | undefined;
  parentId: FolderId | null;
  req: PayloadRequest;
}): Promise<FolderId> => {
  const { payload } = req;
  const page = options.collections[collection];
  const isLocalized = Boolean(payload.config.localization);
  const slotKey =
    req.locale && req.locale !== "all"
      ? req.locale
      : payload.config.localization
        ? payload.config.localization.defaultLocale
        : noLocaleKey;
  const hasDrafts = Boolean(
    payload.collections[toCollectionSlug(collection)]?.config.versions?.drafts
  );

  const data: Record<string, unknown> = { folder: parentId };
  const setOverride = (field: string, localized: boolean, value: string | undefined) => {
    if (value === undefined) {
      return;
    }
    data[field] = localized && isLocalized ? { [slotKey]: value } : value;
  };
  if (isRoot) {
    setOverride(
      page.titleField,
      hasLocalizedField(payload, collection, page.titleField),
      overrides?.name
    );
    setOverride(page.segmentField, page.segmentLocalized, overrides?.slug);
  }

  const nested = createNestedRequest(req);
  nested.context = { ...nested.context, foldersDuplicate: { folder: parentId, isBesideSource } };
  const copy = (await payload.duplicate({
    collection: toCollectionSlug(collection),
    data: data as never,
    depth: 0,
    draft: true,
    id,
    locale: (isLocalized ? "all" : undefined) as never,
    overrideAccess,
    req: nested,
    select: { id: true } as never,
  })) as { id: FolderId };

  // With a status per locale, a duplicate in every locale keeps the original's published locales
  // (Payload copies the status object whole), and a copy is a draft.
  if (hasDrafts && isStatusLocalized(payload, collection)) {
    const row = (await payload.db.findOne({
      collection: toCollectionSlug(collection),
      locale: "all",
      req,
      select: { _status: true } as never,
      where: { id: { equals: copy.id } },
    })) as { _status?: unknown } | null;
    if (row && isPublishedStatus(row._status)) {
      await payload.update({
        collection: toCollectionSlug(collection),
        data: { _status: "draft" } as never,
        depth: 0,
        id: copy.id,
        locale: (getLocaleCodes(payload.config)[0] ?? undefined) as never,
        overrideAccess: true,
        req: createNestedRequest(req),
        select: { id: true } as never,
        unpublishAllLocales: true,
      } as never);
    }
  }

  return copy.id;
};

/**
 * The step of a copy: each unit is a folder created with the source's names, slugs and type
 * settings (and the locks that go with them), or a page duplicated by Payload, so the page's own
 * hooks run: a fresh order key on top, a free `-copy` segment, no root flag. `state.idMap` carries
 * the id of each folder copy to the steps that create its content. A unit whose source is gone, or
 * whose parent copy was not made, is passed over; a unit copied by an earlier try of this step
 * (its folder is in `idMap`) is not copied again.
 */
const copyUnits: OperationHandler["run"] = async ({ options, params, req, state }, units) => {
  const targetFolder = (params.targetFolder ?? null) as FolderId | null;
  const overrides = params.overrides as DuplicateRequest["overrides"] | undefined;
  const overrideAccess = params.overrideAccess === true;
  const idMap = (state.idMap ?? {}) as Record<string, FolderId>;
  const created = (state.created ?? []) as ItemRef[];
  let copied = typeof state.copied === "number" ? state.copied : 0;
  let skipped = typeof state.skipped === "number" ? state.skipped : 0;

  for (const unit of units as DuplicateUnit[]) {
    const isRoot = unit.parent === "target";
    const parentId = isRoot ? targetFolder : (idMap[String(unit.parent)] ?? undefined);
    if (parentId === undefined) {
      skipped += 1;
      continue;
    }
    if (unit.kind === "folder") {
      if (idMap[String(unit.id)] !== undefined) {
        continue;
      }
      const source = await readFolderRecord(req, options, unit.id);
      if (!source || source.storedRow.deletedAt) {
        skipped += 1;
        continue;
      }
      const copyId = await copyFolder({
        isRoot,
        options,
        overrideAccess,
        overrides,
        parentId,
        req,
        source,
      });
      idMap[String(unit.id)] = copyId;
      if (isRoot) {
        created.push({ collection: options.folders.slug, id: copyId });
      }
    } else {
      const source = (await req.payload.db.findOne({
        collection: toCollectionSlug(unit.collection),
        req,
        select: { folder: true } as never,
        where: { id: { equals: unit.id } },
      })) as { folder?: FolderId | { id: FolderId } | null } | null;
      if (!source) {
        skipped += 1;
        continue;
      }
      const sourceFolder = normalizeFolderReference(source.folder).id;
      const copyId = await copyPage({
        collection: unit.collection,
        id: unit.id,
        isBesideSource: String(sourceFolder) === String(parentId),
        isRoot,
        options,
        overrideAccess,
        overrides,
        parentId,
        req,
      });
      if (isRoot) {
        created.push({ collection: unit.collection, id: copyId });
      }
    }
    copied += 1;
  }
  state.copied = copied;
  state.created = created;
  state.idMap = idMap;
  state.skipped = skipped;
};

/**
 * A step is its own request and carries no `?locale=`, while the copies write a chosen name and
 * segment into the locale of the request that started the copy, so the step takes that locale from
 * the stored params for as long as it runs.
 */
const duplicateHandler: OperationHandler = {
  run: async (context, units) => {
    const { locale } = context.params;
    if (typeof locale !== "string") {
      await copyUnits(context, units);

      return;
    }
    const { req } = context;
    const previousLocale = req.locale;
    req.locale = locale as typeof req.locale;
    try {
      await copyUnits(context, units);
    } finally {
      req.locale = previousLocale;
    }
  },
};

registerOperationHandler("duplicate", duplicateHandler);

/**
 * Copies `items` into a folder (spec section 7.10): copies are drafts placed on top, a folder is
 * copied with everything beneath it and keeps its page types and locks, and a segment that is taken
 * gets `-copy`. Up to `limits.maxSyncDocuments` documents run at once in one transaction under the
 * tree lock and answer the roots of the copy; above that an operation is stored and its id answered.
 */
export const applyDuplicate = async (
  req: PayloadRequest,
  request: DuplicateRequest,
  {
    options = getResolvedOptions(req.payload),
    overrideAccess = false,
  }: { options?: ResolvedOptions; overrideAccess?: boolean } = {}
): Promise<DuplicateResult> => {
  const plan = await planDuplicate(req, request, { options, overrideAccess });
  const outcome = await runOrQueue({
    kind: "duplicate",
    options,
    params: {
      ...(typeof req.locale === "string" ? { locale: req.locale } : {}),
      overrideAccess,
      overrides: request.overrides ?? null,
      targetFolder: plan.targetFolder,
    },
    req,
    state: { copied: 0, created: [], idMap: {}, skipped: 0 },
    units: plan.units,
  });
  if (outcome.queued) {
    return { operationId: outcome.operationId, total: plan.total };
  }

  // Created in reverse, so the first item selected ends on top; the answer follows the selection.
  return {
    copied: outcome.state.copied as number,
    created: [...(outcome.state.created as ItemRef[])].reverse(),
  };
};

export type DuplicateItemsArgs = DuplicateRequest & {
  /** Like Payload's Local API: default false, so the user of `req` (or `user`) must be allowed to read and create. */
  overrideAccess?: boolean;
  req?: PayloadRequest;
  user?: CreatePayloadRequestArgs["user"];
};

/** `applyDuplicate` for server code: builds a request for `user` when it is not given one. */
export const duplicateItems = async (
  payload: Payload,
  args: DuplicateItemsArgs
): Promise<DuplicateResult> => {
  const { overrideAccess, req: callerRequest, user, ...request } = args;
  const req = callerRequest ?? (await createPayloadRequest({ payload, req: {}, user }));

  return applyDuplicate(req, request, { overrideAccess });
};
