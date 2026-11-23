import type { VeEditorState } from "../../shared/protocol.js";

import { isEditorStateTree } from "../../shared/richText/editorStateTree.js";
import { withRelatedDocumentsAsIds } from "../../shared/richText/relatedIds.js";

const asJson = (posted: unknown): string | null => {
  try {
    return JSON.stringify(posted) ?? null;
  } catch {
    return null;
  }
};

export const readPostedEditorState = (posted: unknown, maxLength: number): VeEditorState | null => {
  const json = asJson(posted);
  if (json === null || json.length > maxLength) return null;

  const state: unknown = JSON.parse(json);
  return isEditorStateTree(state) ? withRelatedDocumentsAsIds(state) : null;
};
