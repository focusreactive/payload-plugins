import type { FolderId } from "../../types.js";

/**
 * What the create drawer knows of its document. A collection with autosave has its document made
 * by the server when the drawer opens (Payload's document view creates a draft from the drawer's
 * initial data), and every later change is saved by an autosave that reports through the drawer's
 * `onSave` with its own request context (`getDocPermissions: false`, `incrementVersionCount`). A
 * save the editor asks for (Save, Save draft, Publish) carries neither.
 */
export type DrawerSaveEvent = {
  context?: { getDocPermissions?: boolean; incrementVersionCount?: boolean } | null;
};

export type DrawerDraftState = {
  /** The editor saved, so the document is theirs to keep. */
  hasSavedByHand: boolean;
};

export const initialDrawerDraftState: DrawerDraftState = { hasSavedByHand: false };

export const isAutosaveEvent = (event: DrawerSaveEvent): boolean =>
  event.context?.getDocPermissions === false || event.context?.incrementVersionCount !== undefined;

export const applyDrawerSave = (
  state: DrawerDraftState,
  event: DrawerSaveEvent
): DrawerDraftState => (isAutosaveEvent(event) ? state : { hasSavedByHand: true });

/** Cancel must not leave a draft behind in the folder (spec section 7.7). */
export const shouldDiscardDraft = (state: DrawerDraftState): boolean => !state.hasSavedByHand;

export type DrawerDraftCandidate = {
  _status?: unknown;
  createdAt?: unknown;
  id: FolderId;
  [field: string]: unknown;
};

/**
 * The document the drawer's opening made, among the documents found in the target folder since it
 * opened: a draft carrying exactly the segment the drawer was given. The server made it from the
 * drawer's initial data, so nothing else has that segment in that folder unless the editor changed
 * it, and then it is left alone rather than guessed at. `null` when nothing matches or several do.
 */
export const pickDrawerDraft = (
  candidates: readonly DrawerDraftCandidate[],
  { segmentField, slug }: { segmentField: string; slug: string }
): FolderId | null => {
  const matches = candidates.filter(
    (candidate) => candidate._status === "draft" && candidate[segmentField] === slug
  );

  return matches.length === 1 ? matches[0].id : null;
};
