import type { FieldAccess } from "payload";

export const MANUAL_SHORTCODE_PREFIX = "manual-";

export function isSyncedFromPassle(passleShortcode: unknown): boolean {
  return (
    typeof passleShortcode === "string" && !passleShortcode.startsWith(MANUAL_SHORTCODE_PREFIX)
  );
}

/**
 * Passle is where these fields are written, and every re-sync overwrites them, so an edit made
 * here would vanish on the next webhook without warning. Locking them makes Passle the one place
 * to change an article. Reads the stored document rather than the incoming data, because the
 * incoming data is what a request controls. The ingest writes with overrideAccess, so it is not
 * affected; an insight typed in by hand keeps every field editable.
 */
export const editableUnlessSyncedFromPassle: FieldAccess = ({ data, doc }) =>
  !isSyncedFromPassle(doc?.passleShortcode ?? data?.passleShortcode);
