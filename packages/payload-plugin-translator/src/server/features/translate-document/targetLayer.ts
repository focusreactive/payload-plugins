import type { CollectionConfig } from "payload";
import { hasAutosaveEnabled, hasDraftsEnabled } from "payload/shared";

/** The slice of a collection config this decision reads. */
export type VersionsSlice = CollectionConfig["versions"];

/**
 * Which layer of a document a translation reads from and writes to.
 *
 * A discriminated union rather than one shape with optional fields, because one combination is
 * destructive: `publishSpecificLocale` on a collection with versions but NO drafts silently drops
 * every other locale from the live row — measured, no error, no log. Here that combination cannot
 * be built: the field exists only on `publish`, and `publish` is only ever returned for a
 * collection that has drafts.
 */
export type TargetLayer =
  | {
      kind: "no-drafts";
      readDraft: false;
      write: { autosave: false };
    }
  | {
      kind: "draft";
      readDraft: true;
      write: { draft: true; autosave: boolean };
    }
  | {
      kind: "publish";
      readDraft: false;
      write: { publishSpecificLocale: string; autosave: false };
      /**
       * Merged into the written data. Looks redundant beside `publishSpecificLocale` and is not:
       * without it, any other locale holding a pending draft drags the whole document back to
       * `draft` (#102).
       */
      status: "published";
    };

/**
 * Invariant callers depend on: `readDraft` is true exactly when `write.draft` is true. The
 * reconciler copies every untranslated leaf from the read into the write, so a mismatched pair
 * moves content across the draft/live boundary (#102).
 */
export function resolveTargetLayer(args: {
  versions: VersionsSlice;
  publishOnTranslation: boolean;
  targetLng: string;
}): TargetLayer {
  const { versions, publishOnTranslation, targetLng } = args;
  const config = { versions };

  if (!hasDraftsEnabled(config))
    return { kind: "no-drafts", readDraft: false, write: { autosave: false } };

  if (publishOnTranslation) {
    return {
      kind: "publish",
      readDraft: false,
      write: { publishSpecificLocale: targetLng, autosave: false },
      status: "published",
    };
  }

  return {
    kind: "draft",
    readDraft: true,
    write: { draft: true, autosave: hasAutosaveEnabled(config) },
  };
}
