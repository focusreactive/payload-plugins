import type { IdPath } from "../contract.js";

export const renderIdPath = (idPath: IdPath): string => idPath.join(".") || "<root>";
