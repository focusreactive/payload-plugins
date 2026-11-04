import type { FolderId } from "../types.js";

export type StructureEdit = "deliberate" | "none" | "stale";

type ClassifyArgs = {
  /** Whether the write names a `parent`, `folder` or `orderKey` different from the stored one. */
  changesStructure: boolean;
  incomingRevision: unknown;
  storedRevision: number;
  /**
   * A write that names no revision. Pages treat it as stale data (a version restore of a version
   * saved before the plugin has no revision), folders as a deliberate edit (they have no versions,
   * no forms and no scheduled publishes, so nothing stale can reach them).
   */
  missingRevisionIsStale: boolean;
};

/** A revision a write carries as a number: NaN when it names none or something that is not a number. */
export const coerceRevision = (incoming: unknown): number =>
  typeof incoming === "number" || typeof incoming === "string" ? Number(incoming) : Number.NaN;

/** An unset, null or empty-string text value, which a form and an MCP tool both send for "no value". */
export const isEmptyText = (value: unknown): boolean =>
  value === undefined || value === null || value === "";

/**
 * Spec section 5.3: a structural change that carries the stored revision is a deliberate edit and
 * is refused outside the move core; one that carries an older revision (or none, for pages) comes
 * from stale data and is replaced by the stored structure.
 */
export const classifyStructureEdit = ({
  changesStructure,
  incomingRevision,
  missingRevisionIsStale,
  storedRevision,
}: ClassifyArgs): StructureEdit => {
  if (!changesStructure) {
    return "none";
  }
  const revision = coerceRevision(incomingRevision);
  if (Number.isNaN(revision)) {
    return missingRevisionIsStale ? "stale" : "deliberate";
  }

  return revision < storedRevision ? "stale" : "deliberate";
};

/** Whether a write's `parent` or `folder` value names a different folder than the stored one. */
export const namesOtherFolder = (
  incoming: { id: FolderId | null; invalid: boolean },
  stored: FolderId | null
): boolean => incoming.invalid || String(incoming.id) !== String(stored);

export const namesOtherOrderKey = (incoming: unknown, stored: string | null): boolean =>
  incoming !== undefined && incoming !== stored;
