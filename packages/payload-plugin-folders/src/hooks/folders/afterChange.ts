import type { CollectionAfterChangeHook } from "payload";

import { queueAfterPathChange } from "../../core/afterPathChange.js";
import { planFolderPaths, readFolderRecord } from "../../core/folderRecords.js";
import type { FolderRecord } from "../../core/folderRecords.js";
import { getDefaultLocaleKey, getFolderLocaleKeys, noLocaleKey } from "../../core/locales.js";
import {
  clearTakenRedirectRows,
  pageLocalesOfFolderChange,
  shouldWriteRedirects,
} from "../../core/redirects.js";
import { popFolderSnapshot, rewriteFolderSubtree, writeFolderRow } from "../../core/subtree.js";
import { applyTypeLock, describeTypeLockChange, releaseTypeLock } from "../../core/typeLocks.js";
import { bumpRevision } from "../../core/treeLock.js";
import type { FolderId, ResolvedOptions } from "../../types.js";
import { isInternalWrite } from "../context.js";

/**
 * The save wrote the request locale's path. Every other locale's path follows from the same
 * segments, so one write of all locales completes it. When the folder's path changed, the same
 * transaction, under the same tree lock, rewrites its subfolders and then, after the commit,
 * reports every changed URL to `hooks.afterPathChange` (spec section 5.2). A type lock is
 * propagated here too, because it writes the same rows.
 *
 * An error anywhere in here rolls the whole save back, the rename included, because the save
 * runs in one transaction. A bulk update would commit the other documents regardless, so the
 * collection's `beforeOperation` refuses a bulk update of these fields.
 */
export const buildFolderAfterChange =
  (options: ResolvedOptions): CollectionAfterChangeHook =>
  async ({ doc, operation, req }) => {
    if (isInternalWrite(req)) {
      return doc;
    }
    const { payload } = req;
    const keys = getFolderLocaleKeys(payload, options);
    const defaultKey = getDefaultLocaleKey(payload, options);
    const folderId = doc.id as FolderId;
    const previous = operation === "update" ? popFolderSnapshot(req, folderId) : null;
    const stored = await readFolderRecord(req, options, folderId);
    let current: FolderRecord | null = stored;

    if (stored) {
      const parent = stored.parent ? await readFolderRecord(req, options, stored.parent) : null;
      const plan = planFolderPaths({
        defaultLocaleKey: defaultKey,
        keys,
        parent,
        slug: stored.slug,
      });
      current = { ...stored, fullPath: plan.fullPath };

      if (
        keys.length > 1 &&
        keys.some((key) => (stored.fullPath[key] ?? "") !== plan.fullPath[key])
      ) {
        // A database-level write, so the caller's request keeps its own context and locale (a
        // nested Local API update would merge `foldersInternal` and `locale: "all"` into the
        // shared `req` and switch every later folder rule off). The row goes in whole, because the
        // drizzle adapter deletes the locale rows a write leaves out.
        await writeFolderRow({
          ancestorIds: plan.ancestorIds,
          depth: plan.depth,
          fullPath: plan.fullPath,
          options,
          record: stored,
          req,
        });
      }
    }

    if (
      operation === "create" &&
      current &&
      (shouldWriteRedirects(req, options) || options.redirects.enabled)
    ) {
      // A new folder takes its paths: a prefix row of a folder that used to live there is stale.
      await clearTakenRedirectRows({
        req,
        taken: keys
          .filter((key) => Boolean(current.fullPath[key]))
          .flatMap((key) =>
            pageLocalesOfFolderChange(payload, key === noLocaleKey ? null : key).map((locale) => ({
              kind: "folderPrefix" as const,
              locale,
              path: current.fullPath[key] as string,
            }))
          ),
      });
    }

    if (previous && current) {
      const hasPathChanged = keys.some(
        (key) =>
          (previous.fullPath[key] || previous.fullPath[defaultKey] || "") !==
          (current.fullPath[key] || current.fullPath[defaultKey] || "")
      );
      if (hasPathChanged) {
        const { changes } = await rewriteFolderSubtree({
          options,
          previousRoot: previous,
          req,
          root: current,
        });
        await queueAfterPathChange({ changes, options, reason: "folderUpdate", req });
      }

      const lockChange = describeTypeLockChange(previous, current);
      if (lockChange === "propagate") {
        await applyTypeLock({ locker: current, options, req });
      } else if (lockChange === "release") {
        await releaseTypeLock({ locker: current, options, req });
      }
    }

    await bumpRevision(req);

    return doc;
  };
