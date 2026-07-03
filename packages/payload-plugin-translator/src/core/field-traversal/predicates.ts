import type { ArrayFieldLike, BlocksFieldLike, FieldLike, GroupFieldLike, TabLike } from "./types";

/**
 * Framework-agnostic re-implementations of Payload's field predicates, defined over the
 * structural {@link FieldLike} family so this traversal layer carries no `payload` import.
 * Each matches `payload/shared` exactly on every field type (pinned by `predicates.test.ts`);
 * the parity guard must stay green before the classifier can rely on these.
 *
 * @public
 */

/** True for an `array` field. Mirrors `payload/shared`'s `fieldIsArrayType`. */
export const fieldIsArrayType = (field: FieldLike): field is ArrayFieldLike =>
  field.type === "array";

/** True for a `blocks` field. Mirrors `payload/shared`'s `fieldIsBlockType`. */
export const fieldIsBlockType = (field: FieldLike): field is BlocksFieldLike =>
  field.type === "blocks";

/** True for a `group` field. Mirrors `payload/shared`'s `fieldIsGroupType`. */
export const fieldIsGroupType = (field: FieldLike): field is GroupFieldLike =>
  field.type === "group";

/**
 * True when a field carries data (has a `name`) and is not a presentational `ui` field.
 * Mirrors `payload/shared`'s `fieldAffectsData`.
 */
export const fieldAffectsData = (field: FieldLike): boolean =>
  "name" in field && field.type !== "ui";

/** True when a tab has a `name` (so it opens a data boundary). Mirrors `payload/shared`'s `tabHasName`. */
export const tabHasName = (tab: TabLike): tab is TabLike & { name: string } => "name" in tab;
