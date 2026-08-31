/** Which layer of a document a translation reads from and writes to. */

export type VersionsSlice = {
  /** Payload accepts `autosave: true` and `autosave: { interval }` — hence the `object` arm. */
  drafts?: boolean | { autosave?: boolean | object };
};

export type TargetLayer = {
  /** `payload.findByID`'s `draft` argument. */
  readDraft: boolean;
  /** Spread verbatim into `payload.update`. Absent keys must stay absent, never `undefined`. */
  write: {
    draft?: true;
    publishSpecificLocale?: string;
    autosave: boolean;
  };
  /**
   * Merged into the written data. Looks redundant beside `publishSpecificLocale` and is not:
   * without it, any other locale holding a pending draft drags the whole document back to
   * `draft` (#102).
   */
  status?: "published";
};

/**
 * Invariant callers depend on: `readDraft` is true exactly when `write.draft` is true. The
 * reconciler copies every untranslated leaf from the read into the write, so a mismatched pair
 * moves content across the draft/live boundary (#102).
 */
export function resolveTargetLayer(args: {
  versions: VersionsSlice | undefined;
  publishOnTranslation: boolean;
  targetLng: string;
}): TargetLayer {
  const { versions, publishOnTranslation, targetLng } = args;
  const drafts = versions?.drafts;

  if (!drafts) return { readDraft: false, write: { autosave: false } };

  if (publishOnTranslation) {
    return {
      readDraft: false,
      write: { publishSpecificLocale: targetLng, autosave: false },
      status: "published",
    };
  }

  return {
    readDraft: true,
    write: { draft: true, autosave: typeof drafts === "object" && Boolean(drafts.autosave) },
  };
}
