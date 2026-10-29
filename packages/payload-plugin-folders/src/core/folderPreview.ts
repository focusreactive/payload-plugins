import { APIError } from "payload";
import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ItemRef } from "../types.js";
import { findRefusedChecks, forbiddenRenameMessage, isPublishRefusedBeneath } from "./access.js";
import { normalizeFolderReference, planFolderPaths, readFolderRecord } from "./folderRecords.js";
import type { FolderRecord } from "./folderRecords.js";
import {
  getDefaultLocaleKey,
  getFolderLocaleKeys,
  noLocaleKey,
  requestLocaleKey,
} from "./locales.js";
import { planMove, summarizePageChanges } from "./move.js";
import { planFolderPrefixRows, shouldWriteRedirects } from "./redirects.js";
import type { MoveBlock, MovePreview, PlanSettings } from "./move.js";
import { getResolvedOptions } from "./runtime.js";
import { SEGMENT_ERROR_MESSAGE, isValidSegment } from "./slugify.js";
import {
  findPageChanges,
  planSubtreeRewrite,
  readFolderDescendants,
  selectWrittenPaths,
} from "./subtree.js";
import { findSegmentConflicts, getPageLocaleKeys } from "./uniqueness.js";

export type FolderEdit = {
  /** The folder being edited. */
  folder: FolderId;
  /** The locale `slug` is written in; default: the default locale. */
  locale?: string;
  /** `null` for the top level; absent leaves the parent as it is. */
  parent?: FolderId | null;
  /** The new segment in `locale`; absent leaves the slug as it is. */
  slug?: string;
};

const badRequest = (message: string): APIError => new APIError(message, 400, null, true);

const emptyPreview = (blocked: MoveBlock[], targetFolderId: FolderId | null): MovePreview => ({
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
  warnings: [],
});

/**
 * What saving an edit of one folder would change, without writing: the same preview a move gives,
 * for the dialog that asks before a rename rewrites URLs. A rename counts the pages beneath the
 * folder whose URL changes and the `folderPrefix` redirect row it would write, and refuses what a
 * save refuses (an invalid or reserved segment, depth, size, a path another folder or a page of
 * the parent already has).
 *
 * A change of `parent` is a move and goes through `planMove`, so its checks and counts are the
 * move's. Moving and renaming in one edit is a 400: a save cannot do both either (a folder's
 * `parent` is only changed by `moveItems`), and the two steps are separate writes.
 *
 * `overrideAccess: false` also asks the folders' `update` access, with the slug as `data`.
 */
export const planFolderEdit = async (
  req: PayloadRequest,
  edit: FolderEdit,
  { overrideAccess = false }: PlanSettings = {}
): Promise<MovePreview> => {
  const { payload } = req;
  const options = getResolvedOptions(payload);
  const keys = getFolderLocaleKeys(payload, options);
  const defaultKey = getDefaultLocaleKey(payload, options);
  const folderRef: ItemRef = { collection: options.folders.slug, id: edit.folder };

  if (edit.locale !== undefined) {
    const locales = payload.config.localization ? payload.config.localization.localeCodes : [];
    if (locales.length > 0 && !locales.includes(edit.locale)) {
      throw badRequest(`"${edit.locale}" is not a locale of this site`);
    }
  }
  const requestedParent = edit.parent === undefined ? null : normalizeFolderReference(edit.parent);
  if (requestedParent?.invalid) {
    throw badRequest("Use null for the top level of the tree: 0 is not a folder");
  }

  const stored = await readFolderRecord(req, options, edit.folder);
  if (!stored) {
    throw new APIError("This folder no longer exists", 404, null, true);
  }

  const parentChanges =
    requestedParent !== null &&
    String(requestedParent.id ?? null) !== String(stored.parent ?? null);
  if (parentChanges) {
    if (edit.slug !== undefined) {
      throw badRequest("Change the parent and the slug in two steps: a move and a rename");
    }

    return planMove(req, { items: [folderRef], toFolder: requestedParent.id }, { overrideAccess });
  }
  if (edit.slug === undefined) {
    return emptyPreview([], stored.parent);
  }

  const blocked: MoveBlock[] = [];
  const block = (reason: MoveBlock["reason"], message: string, locale?: string | null): void => {
    blocked.push({ item: folderRef, message, reason, ...(locale === undefined ? {} : { locale }) });
  };
  const toLocale = (key: string): string | null => (key === noLocaleKey ? null : key);

  if (!overrideAccess) {
    const refused = await findRefusedChecks({
      checks: [
        {
          collection: options.folders.slug,
          data: { slug: edit.slug },
          id: stored.id,
          key: "update",
          operation: "update",
        },
      ],
      req,
    });
    if (refused.has("update")) {
      block("forbidden", "You are not allowed to change this folder");

      return emptyPreview(blocked, stored.parent);
    }
  }

  const writeKey = requestLocaleKey(payload, options, edit.locale);
  const slug = { ...stored.slug, [writeKey]: edit.slug };
  const parent: FolderRecord | null =
    stored.parent === null ? null : await readFolderRecord(req, options, stored.parent);
  const plan = planFolderPaths({ defaultLocaleKey: defaultKey, keys, parent, slug });
  const previousPlan = planFolderPaths({
    defaultLocaleKey: defaultKey,
    keys,
    parent,
    slug: stored.slug,
  });
  const changedKeys = keys.filter((key) => plan.segments[key] !== previousPlan.segments[key]);
  if (changedKeys.length === 0) {
    return emptyPreview([], stored.parent);
  }

  const reservedRootSegments = new Set(options.reservedRootSegments);
  for (const key of changedKeys) {
    const segment = plan.segments[key];
    if (segment === "") {
      block("reserved", "A folder needs a slug", toLocale(key));
    } else if (!isValidSegment(segment, { atSiteRoot: stored.parent === null })) {
      block("reserved", SEGMENT_ERROR_MESSAGE, toLocale(key));
    } else if (stored.parent === null && reservedRootSegments.has(segment.toLowerCase())) {
      block("reserved", `/${segment} is used by the site itself`, toLocale(key));
    }
  }
  if (plan.depth > options.maxDepth) {
    block(
      "depth",
      `This would make URLs ${plan.depth} segments deep; the limit is ${options.maxDepth}`
    );
  }
  if (blocked.length > 0) {
    return emptyPreview(blocked, stored.parent);
  }

  const { totalDocs } = await payload.db.count({
    collection: toCollectionSlug(options.folders.slug),
    req,
    where: { ancestorIds: { contains: `/${stored.id}/` } },
  });
  if (totalDocs + 1 > options.limits.maxFoldersPerMove) {
    block(
      "size",
      `This rename would rewrite ${totalDocs + 1} folders; the limit is ${options.limits.maxFoldersPerMove}`
    );

    return emptyPreview(blocked, stored.parent);
  }

  // A rename changes every live URL beneath the folder, so it needs the publish rights a move of
  // those pages would (decision 23). This runs before any conflict is read, so a refused user is
  // told nothing about the content around the folder.
  const descendants = await readFolderDescendants(req, options, stored.id);
  if (
    !overrideAccess &&
    (await isPublishRefusedBeneath({
      folderIds: [stored.id, ...descendants.map((folder) => folder.id)],
      options,
      req,
    }))
  ) {
    block("forbidden", forbiddenRenameMessage);

    return emptyPreview(blocked, stored.parent);
  }

  // Unlocalized folder segments apply in every locale a page can be read in.
  const pageKeys = getPageLocaleKeys(payload);
  for (const key of changedKeys) {
    const segment = plan.segments[key];
    for (const slot of key === noLocaleKey ? pageKeys : [key]) {
      const conflicts = await findSegmentConflicts({
        folder: parent,
        locale: slot,
        options,
        publishedOnly: false,
        req,
        segments: [segment],
      });
      const conflict = conflicts.get(segment);
      if (conflict) {
        block(
          "conflict",
          `${conflict.path} is already used by ${conflict.kind === "folder" ? "another folder" : conflict.title}`,
          toLocale(slot)
        );
      }
    }
  }
  if (blocked.length > 0) {
    return emptyPreview(blocked, stored.parent);
  }

  const current: FolderRecord = {
    ...stored,
    ancestorIds: plan.ancestorIds,
    depth: plan.depth,
    fullPath: selectWrittenPaths({ defaultKey, keys, plan, record: stored }),
    slug,
  };
  const subtree = planSubtreeRewrite({
    descendants,
    options,
    previousRoot: stored,
    req,
    root: current,
  });
  const changes = [
    ...subtree.changes,
    ...(await findPageChanges({
      currentById: subtree.currentById,
      options,
      previousById: subtree.previousById,
      req,
    })),
  ];
  const { publishedChanges, samples, urlChanges } = summarizePageChanges(changes);
  const isWritingRows = shouldWriteRedirects(req, options);

  return {
    ...emptyPreview([], stored.parent),
    foldersRewritten: 1 + descendants.length,
    mirrorRowsToWrite: options.redirects.mirrorToRedirectsPlugin ? publishedChanges.length : 0,
    redirectRowsToWrite: isWritingRows
      ? planFolderPrefixRows({
          changes,
          folder: { collection: options.folders.slug, id: stored.id },
        }).length
      : 0,
    samples,
    urlChanges,
  };
};
