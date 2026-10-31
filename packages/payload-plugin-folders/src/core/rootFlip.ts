/**
 * The error a live save gets when it flips `isFolderRoot` on over a draft nobody has published.
 * The admin matches the text to offer "Save as draft instead", so it stays one constant.
 */
export const rootDraftPendingMessage =
  "This page has a newer draft, and a live save would publish it. Save as draft instead.";

type RootFlipFacts = {
  /** The collection has drafts: without them there is no draft to publish. */
  hasDrafts: boolean;
  /** The save writes the live row (it is not a draft save). */
  isLiveSave: boolean;
  /** The flag the latest version, drafts included, already carries. */
  latestIsRoot: boolean;
  /** The latest version is a draft: someone saved after the last publish. */
  latestIsDraft: boolean;
  /** The flag the save sets, `undefined` when it leaves it alone. */
  requestedRoot: unknown;
};

/**
 * Spec section 4 and the Set as root race: a live save that turns the root flag on publishes the
 * latest draft along with it, including edits nobody reviewed. The admin reads the page's status
 * before it saves, but a draft saved in the round trip after that read gets past it, so the server
 * refuses the save under the tree lock. A save whose draft already carries the flag (an autosaved
 * edit form, published as it stands) is no flip and passes.
 */
export const isRootFlipOverDraft = ({
  hasDrafts,
  isLiveSave,
  latestIsDraft,
  latestIsRoot,
  requestedRoot,
}: RootFlipFacts): boolean =>
  hasDrafts && isLiveSave && requestedRoot === true && !latestIsRoot && latestIsDraft;
