import type { PayloadRequest, RequestContext } from "payload";

import type { LiveRichTextField, VeEditorState } from "../../shared/protocol.js";

import { isPlainObject } from "../../shared/plainObject.js";

export const UNSAVED_RICH_TEXT_CONTEXT_KEY = "__visualEditingUnsavedRichText";

export type UnsavedRichText = {
  field: LiveRichTextField;
  isPlaced: boolean;
  state: VeEditorState;
};

export const unsavedRichTextOf = (context: RequestContext): UnsavedRichText | null => {
  const unsaved = context[UNSAVED_RICH_TEXT_CONTEXT_KEY];
  return isPlainObject(unsaved) ? (unsaved as UnsavedRichText) : null;
};

export const isUnsavedRichTextRead = (req: PayloadRequest): boolean =>
  unsavedRichTextOf(req.context) !== null;
