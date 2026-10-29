import type { CollectionAfterChangeHook } from "payload";

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
 * segments, so one write of all locales completes it. It goes through the Local API with every
 * localized column of the folder in the data: the drizzle adapter deletes the locale rows a
 * write leaves out, and a one-locale update would also fail Payload's required check on a locale
 * that has no name of its own.
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
          // The generated locale union has no "all", and the folder slug is chosen at runtime.
          await payload.update({
            collection: options.folders.slug,
            context: { foldersInternal: true },
            data: {
              fullPath: withoutEmptyValues(plan.fullPath),
              name: withoutEmptyValues(stored.name),
              slug: withoutEmptyValues(stored.slug),
            } as never,
            depth: 0,
            id: stored.id,
            locale: "all",
            overrideAccess: true,
            req,
            select: { id: true },
          } as never);
        }
      }
    }

    await bumpRevision(req);

    return doc;
  };
