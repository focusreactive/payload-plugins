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
  /**
   * Absent, or `false`: the collection has no draft layer. `true` or an object: it has one.
   * `autosave` inside an object is truthy-tested, since Payload accepts both `true` and
   * `{ interval }`; `drafts: true` therefore means drafts without autosave.
   */
  drafts?: boolean | { autosave?: boolean | object };
};

export type TargetLayer = {
  /**
   * `payload.findByID`'s `draft` argument. `false` on a collection with no drafts means "the only
   * layer there is", not "the published one of two".
   */
  readDraft: boolean;
  /**
   * `payload.update` arguments, spread verbatim at the call site. A key that is absent must be sent
   * as absent — do not normalise it to `undefined` and do not add keys here that the caller then
   * has to filter.
   */
  write: {
    /** Present only for a draft-layer write. Never `false`: absence is how "not a draft" is said. */
    draft?: true;
    /** Present only when publishing, and always the locale being translated. */
    publishSpecificLocale?: string;
    /** Always present. True only for a draft-layer write on an autosave collection. */
    autosave: boolean;
  };
  /**
   * `_status` to merge into the written data, or `undefined` to send none.
   *
   * Only ever `"published"`. It looks redundant beside `publishSpecificLocale` and is not: without
   * it, any other locale holding a pending draft drags the whole document back to `draft`.
   *
   * Sending a status on a draft-layer write is the original defect (#102) — hence never here.
   */
  status?: "published";
};

/**
 * Decide which layer of the document a translation reads from and writes to.
 *
 * **The rule.** A collection with no draft layer gets a plain update, whatever `publishOnTranslation`
 * says — there is nothing to publish *to*, so no publish scope and no status are sent. A collection
 * with drafts gets the published layer when `publishOnTranslation` is true and the draft layer when
 * it is false.
 *
 * **The invariant callers depend on: `readDraft` is true exactly when `write.draft` is true.** The
 * reconciler copies every leaf it does not translate from the read into the write, so a read taken
 * from one layer and a write aimed at another moves content across the boundary between them. Both
 * directions were measured and both cost data loss.
 *
 * **`autosave` is decided, not merely constrained:** it is true for a draft-layer write on an
 * autosave collection and false everywhere else, including a publish-layer write on one.
 *
 * Pure and total: every combination of inputs returns a layer, and none throws. `targetLng` is used
 * only to scope a publish; it never affects which layer is chosen, and no value of it is rejected.
 */
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
