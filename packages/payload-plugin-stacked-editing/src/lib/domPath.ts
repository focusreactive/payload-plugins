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

// The row id alone is ambiguous (`my-items` vs group `my` › `items`), so the path comes from the field wrapper id.
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

export const isRowPathPrefix = (prefix: string, path: string): boolean =>
  path === prefix || path.startsWith(`${prefix}.`);

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
