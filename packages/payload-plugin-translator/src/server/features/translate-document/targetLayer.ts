/**
 * Which layer of a document a translation reads from and writes to.
 *
 * The two sides MUST agree. The reconciler copies every leaf it does not translate straight from the
 * read into the write, so a read taken from one layer and a write aimed at another moves content
 * across the boundary between them — losing a reviewer's corrections in one direction, publishing a
 * colleague's pending edits in the other (#102). Both were measured; see
 * `docs/plans/2026-08-31-draft-safe-locale-writes.md`.
 *
 * That agreement used to rest on two expressions eighty lines apart, kept in step by comments. It
 * now rests on one function, for the same reason `shared/payload/sourceDocument.ts` exists: when two
 * call sites are obliged to match, the obligation belongs in a single unit rather than in prose.
 */

/** The slice of a collection config this decision reads — not Payload's full `versions` type. */
export type VersionsSlice = {
  drafts?: boolean | { autosave?: boolean | object };
};

export type TargetLayer = {
  /** `payload.findByID` argument: read the draft layer, or the published one. */
  readDraft: boolean;
  /** `payload.update` arguments, spread verbatim at the call site. */
  write: {
    draft?: true;
    publishSpecificLocale?: string;
    autosave: boolean;
  };
  /**
   * `_status` to merge into the written data, or `undefined` to send none.
   *
   * Only ever `"published"`. It looks redundant beside `publishSpecificLocale` and is not: without
   * it, any other locale holding a pending draft drags the whole document back to `draft`.
   */
  status?: "published";
};

export function resolveTargetLayer(args: {
  versions: VersionsSlice | undefined;
  publishOnTranslation: boolean;
  targetLng: string;
}): TargetLayer {
  const { versions, publishOnTranslation, targetLng } = args;
  const drafts = versions?.drafts;

  // No drafts: there is one layer, so there is nothing to keep in step.
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
