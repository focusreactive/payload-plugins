import type { CollectionConfig } from "payload";
import { hasAutosaveEnabled, hasDraftsEnabled } from "payload/shared";

export type VersionsSlice = CollectionConfig["versions"];

/**
 * Which layer of a document a translation reads from and writes to.
 *
 * A union, not one shape with optional fields: `publishSpecificLocale` on a collection with
 * versions but no drafts drops every other locale from the live row (Payload 3.84.1, silent).
 * The union makes that pair unbuildable — see `targetLayer.contract.test.ts`.
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
 * Chooses the layer a translation reads from and writes to. Read and write must agree: the
 * reconciler copies every untranslated leaf from one into the other (#102).
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
