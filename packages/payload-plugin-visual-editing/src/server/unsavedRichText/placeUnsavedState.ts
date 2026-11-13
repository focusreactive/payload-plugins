import type { VeEditorState } from "../../shared/protocol.js";

import { richTextValueAt } from "../../shared/editableSchema/editableSchema.js";
import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";
import { withBlockFieldsOf } from "../../shared/richText/blockNodes.js";
import { withSavedNodeFieldsOf } from "./savedNodeFields.js";

export type UnsavedPlacement = {
  fieldKey: string;
  locale: string | undefined;
  state: VeEditorState;
};

export const placeUnsavedState = (
  storedDocument: unknown,
  schema: EditableSchema,
  { fieldKey, locale, state }: UnsavedPlacement
): boolean => {
  const field = richTextValueAt(schema, storedDocument, fieldKey, locale);
  if (!field) return false;
  const stored = field.holder[field.property];
  field.holder[field.property] = withSavedNodeFieldsOf(withBlockFieldsOf(state, stored), stored);
  return true;
};
