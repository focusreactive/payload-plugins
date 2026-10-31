/**
 * The query parameter the plugin's own partial saves (Set as root page, Unset root page, the page
 * settings drawer) send with the `updatedAt` of the latest version they just read. A save without
 * it, such as the edit view's full form or a Local API call, is not checked.
 */
export const rootPreconditionParameter = "frFoldersIfUpdatedAt";

/**
 * The error a save gets when its page changed after the plugin's admin read it, under a collection
 * with drafts: a live save would publish whatever the newer version holds along with the root
 * flag. The admin matches the text to offer "Save as draft instead", so both stay constants.
 */
export const pageChangedMessage =
  "This page changed since it was read, and a live save could publish edits nobody reviewed. Save as draft instead.";

/** The same refusal for a collection without drafts, where there is no draft to save instead. */
export const pageChangedLiveMessage =
  "This page changed since it was read. Reload it and try again.";

export const isPageChangedMessage = (message: string): boolean =>
  message === pageChangedMessage || message === pageChangedLiveMessage;

/** The precondition a request carries, `null` when it has none. A malformed one is kept as `""`. */
export const readRootPrecondition = (query: unknown): string | null => {
  if (typeof query !== "object" || query === null) {
    return null;
  }
  const value = (query as Record<string, unknown>)[rootPreconditionParameter];
  if (value === undefined) {
    return null;
  }

  return typeof value === "string" ? value : "";
};

const toTime = (value: unknown): number => {
  if (typeof value === "string" || value instanceof Date) {
    return new Date(value).getTime();
  }

  return Number.NaN;
};

/**
 * Spec section 4 and the Set as root race: a live save that flips the root flag publishes the
 * latest version along with it, including edits nobody reviewed, and a draft can land in the round
 * trip after the admin read the page. The admin sends the `updatedAt` of the latest version it
 * read; the server compares it with the latest version under the tree lock and refuses the save
 * when they differ, in either direction of the flip. Times are compared as instants, because the
 * two databases write the same moment in different text forms. A marker or a stored time that is
 * not a date counts as changed.
 */
export const hasPageChangedSince = (marker: string, latestUpdatedAt: unknown): boolean => {
  const expected = toTime(marker);
  const latest = toTime(latestUpdatedAt);

  return Number.isNaN(expected) || Number.isNaN(latest) || expected !== latest;
};
