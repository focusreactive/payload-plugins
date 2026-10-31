import { composeFullPath } from "../../core/paths.js";

/** A page as the form holds it: where it sits and what its URL is made of. */
export type PagePathInputs = {
  /** The folder's path in the admin locale; `/` or `""` at the top level. */
  folderPath: string;
  isFolderRoot: boolean;
  segment: string;
};

export type UrlChange = { from: string; to: string };

/**
 * What the URL becomes when the form's values are published, or `null` when it stays the same, or
 * has no URL before or after (a page without a segment has none to change from or to).
 */
export const urlChangeOf = (stored: PagePathInputs, edited: PagePathInputs): UrlChange | null => {
  const from = composeFullPath(stored);
  const to = composeFullPath(edited);

  return from === null || to === null || from === to ? null : { from, to };
};
