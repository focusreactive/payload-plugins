import { indentPerLevel } from "./TreeRow.js";

/** A status row spans the whole width, so it clears the select column to line up with the names. */
export const levelPadding = (level: number): string =>
  `calc(var(--fr-folders-select-width) + var(--spacer-2-5) + ${level * indentPerLevel}px)`;
