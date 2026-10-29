import { APIError, ValidationError } from "payload";
import type { CollectionBeforeChangeHook } from "payload";

import { toCollectionSlug } from "../../collectionSlug.js";
import { lockSourceOf, planFolderTypes } from "../../core/allowedTypes.js";
import {
  normalizeFolderReference,
  planFolderPaths,
  readFolderRecord,
  wouldCreateCycle,
} from "../../core/folderRecords.js";
import type { FolderPathPlan, FolderRecord } from "../../core/folderRecords.js";
import {
  getDefaultLocaleKey,
  getFolderLocaleKeys,
  noLocaleKey,
  requestLocaleKey,
} from "../../core/locales.js";
import type { ValuesByLocale } from "../../core/locales.js";
import { buildSegmentWhere } from "../../core/segmentWhere.js";
import {
  classifyStructureEdit,
  namesOtherFolder,
  namesOtherOrderKey,
} from "../../core/structureGuard.js";
import { keyForNewItem } from "../../core/orderKeys.js";
import { SEGMENT_ERROR_MESSAGE, isValidSegment } from "../../core/slugify.js";
import { getPageDefaultLocale, getPageLocaleKeys, queryLocaleOf } from "../../core/uniqueness.js";
import {
  assertSubtreeWithinLimit,
  pushFolderSnapshot,
  readFolderDescendants,
} from "../../core/subtree.js";
import { forbiddenRenameMessage, isPublishRefusedBeneath } from "../../core/access.js";
import { describeTypeLockChange } from "../../core/typeLocks.js";
import type { FolderId, ResolvedOptions } from "../../types.js";
import { isInternalWrite } from "../context.js";
import { isAccessOverridden } from "./overrideAccess.js";

type FieldProblem = { locale?: string; message: string; path: string };

const pathOfLocker = async (
  req: Parameters<CollectionBeforeChangeHook>[0]["req"],
  options: ResolvedOptions,
  lockerId: FolderId | null
): Promise<string | undefined> => {
  if (lockerId === null) {
    return undefined;
  }
  const locker = await readFolderRecord(req, options, lockerId);

  return locker?.fullPath[getDefaultLocaleKey(req.payload, options)] || undefined;
};

const applyIncoming = (values: ValuesByLocale, incoming: unknown, writeKey: string): void => {
  if (incoming === undefined) {
    return;
  }
  if (writeKey === "all") {
    for (const [localeKey, value] of Object.entries((incoming ?? {}) as ValuesByLocale)) {
      values[localeKey] = typeof value === "string" ? value : null;
    }

    return;
  }
  values[writeKey] = typeof incoming === "string" ? incoming : null;
};

/** The locale to pass to a query on a localized folder column; none when folders are not localized. */
const queryLocale = (localeKey: string): string | undefined =>
  localeKey === noLocaleKey ? undefined : localeKey;

const findLocalesWithChangedSegment = (
  keys: string[],
  plan: FolderPathPlan,
  previous: FolderPathPlan | null
): string[] => keys.filter((key) => !previous || plan.segments[key] !== previous.segments[key]);

export const buildFolderBeforeChange =
  (options: ResolvedOptions): CollectionBeforeChangeHook =>
  async ({ data, operation, originalDoc, req }) => {
    if (isInternalWrite(req) || (operation !== "create" && operation !== "update")) {
      return data;
    }
    const { payload } = req;
    const collection = options.folders.slug;
    const problems: FieldProblem[] = [];
    const fail = () => {
      // A path that is wrong in every locale that falls back to one segment is reported once.
      const distinct = problems.filter(
        (problem, index) =>
          problems.findIndex(
            (other) => other.path === problem.path && other.message === problem.message
          ) === index
      );
      throw new ValidationError({ collection, errors: distinct, req });
    };

    const keys = getFolderLocaleKeys(payload, options);
    const defaultKey = getDefaultLocaleKey(payload, options);
    const writeKey = requestLocaleKey(payload, options, req.locale);

    const stored =
      operation === "update"
        ? await readFolderRecord(req, options, originalDoc?.id as FolderId)
        : null;
    if (operation === "update" && !stored) {
      throw new APIError("This folder no longer exists", 404);
    }

    let parentId: FolderId | null;
    if (operation === "create") {
      const reference = normalizeFolderReference(data.parent);
      if (reference.invalid) {
        problems.push({
          message: "Use null for the top level of the tree: 0 is not a folder",
          path: "parent",
        });
        fail();
      }
      parentId = reference.id;
    } else {
      parentId = stored?.parent ?? null;
      const requested = data.parent === undefined ? null : normalizeFolderReference(data.parent);
      const edit = classifyStructureEdit({
        changesStructure:
          (requested !== null && namesOtherFolder(requested, parentId)) ||
          namesOtherOrderKey(data.orderKey, stored?.orderKey ?? null),
        incomingRevision: data.structureRevision,
        missingRevisionIsStale: false,
        storedRevision: stored?.structureRevision ?? 0,
      });
      if (edit === "deliberate") {
        const target =
          requested === null || requested.id === null
            ? null
            : await readFolderRecord(req, options, requested.id);
        if (target && stored && wouldCreateCycle(stored.id, target)) {
          problems.push({
            message: "A folder cannot be moved into itself or one of its subfolders",
            path: "parent",
          });
          fail();
        }
        throw new APIError("Use moveItems() to move content", 400);
      }
      // A stale or absent structure never reaches the row: the stored one is written back.
      data.parent = parentId as never;
      data.orderKey = (stored?.orderKey ?? null) as never;
      data.structureRevision = (stored?.structureRevision ?? 0) as never;
    }

    let parent: FolderRecord | null = null;
    if (parentId !== null) {
      parent = await readFolderRecord(req, options, parentId);
      if (!parent) {
        problems.push({ message: "The parent folder does not exist", path: "parent" });
        fail();
      }
    }

    const typesPlan = planFolderTypes({
      incoming: data,
      lockedByPath: await pathOfLocker(
        req,
        options,
        operation === "update" ? (stored?.typesLockedBy ?? null) : lockSourceOf(parent)
      ),
      parent,
      stored,
    });
    problems.push(...typesPlan.problems);
    if (problems.length > 0) {
      fail();
    }

    const name: ValuesByLocale = { ...stored?.name };
    const slug: ValuesByLocale = { ...stored?.slug };
    applyIncoming(name, data.name, writeKey);
    applyIncoming(slug, data.slug, writeKey);

    const plan = planFolderPaths({ defaultLocaleKey: defaultKey, keys, parent, slug });
    const previous = stored
      ? planFolderPaths({ defaultLocaleKey: defaultKey, keys, parent, slug: stored.slug })
      : null;

    const missingInDefaultLocale = [
      ...(name[defaultKey] ? [] : ["name"]),
      ...(plan.segments[defaultKey] ? [] : ["slug"]),
    ];
    if (missingInDefaultLocale.length > 0) {
      const message =
        defaultKey === noLocaleKey
          ? `A folder needs a ${missingInDefaultLocale.join(" and a ")}`
          : `A folder needs a ${missingInDefaultLocale.join(" and a ")} in the default locale (${defaultKey}); save it in ${defaultKey} first`;
      for (const path of missingInDefaultLocale) {
        problems.push({ message, path });
      }
      fail();
    }

    const changedKeys = findLocalesWithChangedSegment(keys, plan, previous);

    for (const key of changedKeys) {
      const segment = plan.segments[key];
      const locale = queryLocale(key);
      if (!isValidSegment(segment, { atSiteRoot: parentId === null })) {
        problems.push({ locale, message: SEGMENT_ERROR_MESSAGE, path: "slug" });
      } else if (parentId === null && options.reservedRootSegments.includes(segment)) {
        problems.push({ locale, message: `/${segment} is used by the site itself`, path: "slug" });
      }
    }
    if (problems.length > 0) {
      fail();
    }

    if (plan.depth > options.maxDepth) {
      problems.push({
        message: `This would make URLs ${plan.depth} segments deep; the limit is ${options.maxDepth}`,
        path: operation === "create" ? "parent" : "slug",
      });
      fail();
    }

    if (stored && changedKeys.length > 0) {
      await assertSubtreeWithinLimit({
        action: "rename",
        folderId: stored.id,
        options,
        path: "slug",
        req,
      });
      // A rename changes every live URL beneath the folder, so it needs the publish rights a move
      // of those pages would (decision 23). A system call is never asked.
      if (!isAccessOverridden(req)) {
        const descendants = await readFolderDescendants(req, options, stored.id);
        const isRefused = await isPublishRefusedBeneath({
          folderIds: [stored.id, ...descendants.map((folder) => folder.id)],
          options,
          req,
        });
        if (isRefused) {
          throw new APIError(forbiddenRenameMessage, 403, null, true);
        }
      }
    }
    if (
      stored &&
      describeTypeLockChange(stored, {
        ...stored,
        allowedTypes: typesPlan.allowedTypes,
        lockSubfolderTypes: typesPlan.lockSubfolderTypes,
      }) !== "none"
    ) {
      await assertSubtreeWithinLimit({
        action: "type lock",
        folderId: stored.id,
        options,
        path: "lockSubfolderTypes",
        req,
      });
    }

    for (const key of changedKeys) {
      const fullPath = plan.fullPath[key];
      const locale = queryLocale(key);
      const clash = await payload.db.find({
        collection: toCollectionSlug(collection),
        limit: 1,
        locale,
        pagination: false,
        req,
        select: { id: true },
        where: {
          and: [
            { fullPath: { equals: fullPath } },
            ...(stored ? [{ id: { not_equals: stored.id } }] : []),
          ],
        },
      });
      if (clash.docs.length > 0) {
        problems.push({
          locale,
          message: `${fullPath} is already used by another folder`,
          path: "slug",
        });
        continue;
      }

      // Rule 2 of spec section 2.6: a page in the same folder may not take the folder's segment.
      // A page's `pathSegment` is its own segment only, so the helper adds the pages whose segment
      // in this locale falls back to the default locale's.
      // Folder segments that are not localized apply in every locale a page can be read in, and a
      // localized page column cannot be queried without a locale, so each one is checked in turn.
      const pageLocales: Array<string | undefined> =
        key === noLocaleKey ? getPageLocaleKeys(payload).map(queryLocaleOf) : [locale];
      let isUsedByPage = false;
      for (const page of Object.values(options.collections)) {
        for (const pageLocale of pageLocales) {
          const pageClash = await payload.db.count({
            collection: toCollectionSlug(page.slug),
            locale: pageLocale,
            req,
            where: {
              and: [
                { folder: { equals: parentId } },
                { isFolderRoot: { not_equals: true } },
                page.segmentLocalized && pageLocale !== undefined
                  ? buildSegmentWhere({
                      defaultLocale: getPageDefaultLocale(payload),
                      locale: pageLocale,
                      segment: plan.segments[key],
                    })
                  : { pathSegment: { equals: plan.segments[key] } },
              ],
            },
          });
          if (pageClash.totalDocs > 0) {
            isUsedByPage = true;
            break;
          }
        }
        if (isUsedByPage) {
          break;
        }
      }
      if (isUsedByPage) {
        problems.push({ locale, message: `${fullPath} is already used by a page`, path: "slug" });
      }
    }
    if (problems.length > 0) {
      fail();
    }

    if (operation === "create") {
      data.parent = parentId as never;
      data.orderKey = await keyForNewItem(req, options, parentId);
    }
    data.allowedTypes = typesPlan.allowedTypes as never;
    data.defaultType = typesPlan.defaultType as never;
    data.lockSubfolderTypes = typesPlan.lockSubfolderTypes;
    // Always the computed value: a Local API call with overrideAccess could otherwise name a lock.
    data.typesLockedBy = typesPlan.typesLockedBy as never;
    data.ancestorIds = plan.ancestorIds;
    data.depth = plan.depth;
    data.fullPath = (
      writeKey === "all"
        ? Object.fromEntries(Object.entries(plan.fullPath).filter(([, value]) => value !== ""))
        : plan.fullPath[writeKey]
    ) as never;

    if (stored) {
      // The save's afterChange compares the saved row with this one to find what a rename or a
      // type lock has to rewrite below the folder.
      pushFolderSnapshot(req, stored);
    }

    return data;
  };
