import { FIELD_PATH_SEPARATOR } from "../shared/fieldKey.js";

export const FIELD_ID_PREFIX = "field-";
export const FIELD_ID_SEPARATOR = "__";

const ROW_CONTAINER_ID_SEPARATOR = "-";
const ROW_CONTAINER_ID_INFIX = "-row-";
const ROW_SUFFIX = /-row-\d+$/u;

export const fieldDomIdOf = (fieldPath: string): string =>
  `${FIELD_ID_PREFIX}${fieldPath.replaceAll(FIELD_PATH_SEPARATOR, FIELD_ID_SEPARATOR)}`;

export const rowContainerIdOf = (arrayPath: string, rowIndex: string): string =>
  `${arrayPath.replaceAll(FIELD_PATH_SEPARATOR, ROW_CONTAINER_ID_SEPARATOR)}${ROW_CONTAINER_ID_INFIX}${rowIndex}`;

export const arrayFieldIdOfRow = (rowContainerId: string): string =>
  `${FIELD_ID_PREFIX}${rowContainerId
    .replace(ROW_SUFFIX, "")
    .replaceAll(ROW_CONTAINER_ID_SEPARATOR, FIELD_ID_SEPARATOR)}`;
