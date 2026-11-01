import type { Translate } from "../compat.js";

/** A count with its noun ("3 folders") from a plural key, for sentences that hold two counts. */
export const countText = (
  key: "foldersCount" | "pagesCount",
  count: number,
  translate: Translate
): string => translate(key, { count });
