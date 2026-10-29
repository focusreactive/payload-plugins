import type { CollectionAfterChangeHook } from "payload";

import { toCollectionSlug } from "../../collectionSlug.js";
import { planFolderPaths, readFolderRecord } from "../../core/folderRecords.js";
import { getDefaultLocaleKey, getFolderLocaleKeys } from "../../core/locales.js";
import type { ValuesByLocale } from "../../core/locales.js";
import { bumpRevision } from "../../core/treeLock.js";
import type { FolderId, ResolvedOptions } from "../../types.js";
import { isInternalWrite } from "../context.js";

const withoutEmptyValues = (values: ValuesByLocale): Record<string, string> =>
  Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1]))
  );

/**
 * The save wrote the request locale's path. Every other locale's path follows from the same
 * segments, so one write of all locales completes it.
 */
export const buildFolderAfterChange =
  (options: ResolvedOptions): CollectionAfterChangeHook =>
  async ({ doc, req }) => {
    if (isInternalWrite(req)) {
      return doc;
    }
    const { payload } = req;
    const keys = getFolderLocaleKeys(payload, options);

    if (keys.length > 1) {
      const defaultKey = getDefaultLocaleKey(payload, options);
      const stored = await readFolderRecord(req, options, doc.id as FolderId);
      const parent = stored?.parent ? await readFolderRecord(req, options, stored.parent) : null;
      if (stored) {
        const plan = planFolderPaths({
          defaultLocaleKey: defaultKey,
          keys,
          parent,
          slug: stored.slug,
        });
        if (keys.some((key) => (stored.fullPath[key] ?? "") !== plan.fullPath[key])) {
          // A database-level write, so the caller's request keeps its own context and locale (a
          // nested Local API update would merge `foldersInternal` and `locale: "all"` into the
          // shared `req` and switch every later folder rule off). Every localized column goes in
          // complete, because the drizzle adapter deletes the locale rows a write leaves out.
          await payload.db.updateOne({
            collection: toCollectionSlug(options.folders.slug),
            data: {
              fullPath: withoutEmptyValues(plan.fullPath),
              name: withoutEmptyValues(stored.name),
              slug: withoutEmptyValues(stored.slug),
              updatedAt: new Date().toISOString(),
            },
            id: stored.id,
            req,
            returning: false,
          });
        }
      }
    }

    await bumpRevision(req);

    return doc;
  };
