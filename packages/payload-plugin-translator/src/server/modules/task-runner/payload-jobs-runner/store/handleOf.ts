/**
 * Payload's row id is numeric on an autoincrement database and textual elsewhere, so a handle is
 * always the stringified id.
 */
export const handleOf = (candidate: { id?: unknown } | undefined): string | null =>
  typeof candidate?.id === "string" || typeof candidate?.id === "number"
    ? String(candidate.id)
    : null;
