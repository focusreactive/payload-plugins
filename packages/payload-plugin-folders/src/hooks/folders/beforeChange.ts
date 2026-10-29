import { APIError, ValidationError } from "payload";
import type { CollectionBeforeChangeHook } from "payload";

import { toCollectionSlug } from "../../collectionSlug.js";
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
import { keyForNewItem } from "../../core/orderKeys.js";
import { SEGMENT_ERROR_MESSAGE, isValidSegment } from "../../core/slugify.js";
import type { FolderId, ResolvedOptions } from "../../types.js";
import { isInternalWrite } from "../context.js";

type FieldProblem = { locale?: string; message: string; path: string };

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
      if (data.parent !== undefined) {
        const requested = normalizeFolderReference(data.parent);
        if (requested.invalid || String(requested.id) !== String(parentId)) {
          const target =
            requested.id === null ? null : await readFolderRecord(req, options, requested.id);
          if (target && stored && wouldCreateCycle(stored.id, target)) {
            problems.push({
              message: "A folder cannot be moved into itself or one of its subfolders",
              path: "parent",
            });
            fail();
          }
          throw new APIError("Use moveItems() to move content", 400);
        }
      }
    }

    let parent: FolderRecord | null = null;
    if (parentId !== null) {
      parent = await readFolderRecord(req, options, parentId);
      if (!parent) {
        problems.push({ message: "The parent folder does not exist", path: "parent" });
        fail();
      }
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
      // `pathSegment` holds the effective segment of every locale, so a page whose segment falls
      // back to the default locale is found too, which its own slug field would not show.
      for (const page of Object.values(options.collections)) {
        const pageClash = await payload.db.count({
          collection: toCollectionSlug(page.slug),
          locale,
          req,
          where: {
            and: [
              { folder: { equals: parentId } },
              { isFolderRoot: { not_equals: true } },
              { pathSegment: { equals: plan.segments[key] } },
            ],
          },
        });
        if (pageClash.totalDocs > 0) {
          problems.push({ locale, message: `${fullPath} is already used by a page`, path: "slug" });
          break;
        }
      }
    }
    if (problems.length > 0) {
      fail();
    }

    if (operation === "create") {
      data.parent = parentId as never;
      data.orderKey = await keyForNewItem(req, options, parentId);
    }
    data.ancestorIds = plan.ancestorIds;
    data.depth = plan.depth;
    data.fullPath = (
      writeKey === "all"
        ? Object.fromEntries(Object.entries(plan.fullPath).filter(([, value]) => value !== ""))
        : plan.fullPath[writeKey]
    ) as never;

    return data;
  };
