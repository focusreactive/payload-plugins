/**
 * Payload's admin DOM, as far as this plugin reads it:
 *
 * - every field wrapper has `id="field-<path with . replaced by __>"` (`field-layout__0__items`);
 * - every array / blocks row is wrapped in `<div id="<field path with . replaced by ->-row-<index>">`
 *   (`layout-0-items-row-2`), whose child is the row's `.collapsible`;
 * - the collapsible header's clickable surface is `button.collapsible__toggle`, a direct child of
 *   `.collapsible__toggle-wrap`. Row actions, the drag handle and the block-name input sit above it
 *   with `pointer-events: all`, so a click that lands on the toggle button is a click on the header
 *   itself and nothing else.
 *
 * The row id alone is ambiguous (a field called `my-items` and a group `my` with an array `items`
 * both give `my-items-row-0`), so the field path comes from the field wrapper's id and the row id
 * is only used for the index — and to cross-check the two agree.
 */

export const FIELD_ID_PREFIX = "field-";
const FIELD_ID_SEPARATOR = "__";
const ROW_INFIX = "-row-";
const ROW_SUFFIX = /-row-(\d+)$/u;

export const ROW_COLLAPSIBLE_CLASSES = ["blocks-field__row", "array-field__row"] as const;
export const TOGGLE_SELECTOR = "button.collapsible__toggle";

export const fieldDomIdOf = (fieldPath: string): string =>
  `${FIELD_ID_PREFIX}${fieldPath.replaceAll(".", FIELD_ID_SEPARATOR)}`;

export const fieldPathFromDomId = (id: string): string | null => {
  if (!id.startsWith(FIELD_ID_PREFIX) || id.length === FIELD_ID_PREFIX.length) {
    return null;
  }
  return id.slice(FIELD_ID_PREFIX.length).replaceAll(FIELD_ID_SEPARATOR, ".");
};

export const rowContainerIdOf = (fieldPath: string, rowIndex: number): string =>
  `${fieldPath.split(".").join("-")}${ROW_INFIX}${rowIndex}`;

export const rowIndexFromContainerId = (id: string): number | null => {
  const match = ROW_SUFFIX.exec(id);
  return match?.[1] === undefined ? null : Number(match[1]);
};

/**
 * Row data path from the two ids Payload renders around a row, or `null` when they do not describe
 * the same row (in which case the click is left to Payload).
 */
export const rowPathFromIds = ({
  fieldWrapperId,
  rowContainerId,
}: {
  fieldWrapperId: string;
  rowContainerId: string;
}): string | null => {
  const fieldPath = fieldPathFromDomId(fieldWrapperId);
  const rowIndex = rowIndexFromContainerId(rowContainerId);
  if (fieldPath === null || rowIndex === null) {
    return null;
  }
  if (rowContainerIdOf(fieldPath, rowIndex) !== rowContainerId) {
    return null;
  }
  return `${fieldPath}.${rowIndex}`;
};

/** Whether `path` is `prefix` itself or a path below it (`layout.0` → `layout.0.items.1`). */
export const isRowPathPrefix = (prefix: string, path: string): boolean =>
  path === prefix || path.startsWith(`${prefix}.`);

/**
 * From a `button.collapsible__toggle` to the data path of the array/blocks row it toggles.
 * Returns `null` for every other collapsible (collapsible fields, Lexical blocks, …).
 */
export const rowPathFromToggle = (toggle: Element): string | null => {
  const toggleWrap = toggle.parentElement;
  const collapsible = toggleWrap?.parentElement;
  if (
    !toggleWrap?.classList.contains("collapsible__toggle-wrap") ||
    !collapsible?.classList.contains("collapsible") ||
    !ROW_COLLAPSIBLE_CLASSES.some((name) => collapsible.classList.contains(name))
  ) {
    return null;
  }
  const rowContainer = collapsible.parentElement;
  const fieldWrapper = rowContainer?.parentElement?.closest(
    `.field-type[id^="${FIELD_ID_PREFIX}"]`
  );
  if (!rowContainer?.id || !fieldWrapper) {
    return null;
  }
  return rowPathFromIds({ fieldWrapperId: fieldWrapper.id, rowContainerId: rowContainer.id });
};
