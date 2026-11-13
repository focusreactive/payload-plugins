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

/** What the edit view says about the URL of a page whose form is edited. */
export type FullPathHint =
  /** A page that is live moves from its live URL to the one its form would publish. */
  | { from: string; kind: "change"; to: string }
  /** A page that was never published has no URL yet; this is the one publishing gives it. */
  | { kind: "publishAt"; to: string };

/**
 * The hint under the Full URL, compared with the live row and not with what the form loaded: a
 * segment that was autosaved as a draft and reloaded is still a change from the live URL, and a
 * page nobody has published has nothing to change from. `livePath` is the live row's path, `null`
 * when it has none.
 */
export const fullPathHintOf = ({
  edited,
  isPublished,
  livePath,
}: {
  edited: PagePathInputs;
  isPublished: boolean;
  livePath: string | null;
}): FullPathHint | null => {
  const to = composeFullPath(edited);
  if (to === null) {
    return null;
  }
  if (!isPublished) {
    return { kind: "publishAt", to };
  }

  return livePath === null || livePath === to ? null : { from: livePath, kind: "change", to };
};
