import type { VeEditorState } from "../protocol.js";

import { isEditorStateTree } from "./editorStateTree.js";
import { withRelatedDocumentsAsIds } from "./relatedIds.js";

export const MAX_POSTED_EDITOR_STATE_LENGTH = 1_000_000;

const asJson = (posted: unknown): string | null => {
  try {
    return JSON.stringify(posted) ?? null;
  } catch {
    return null;
  }
};

export const readPostedEditorState = (
  posted: unknown,
  maxLength: number = MAX_POSTED_EDITOR_STATE_LENGTH
): VeEditorState | null => {
  const json = asJson(posted);
  if (json === null || json.length > maxLength) return null;

  const state: unknown = JSON.parse(json);
  return isEditorStateTree(state) ? withRelatedDocumentsAsIds(state) : null;
};
