import type { VeEditorState } from "../../../shared/protocol.js";

import { withBlockFieldsOf } from "../../../shared/richText/blockNodes.js";
import { isEditorStateTree } from "../../../shared/richText/editorStateTree.js";
import { markTextLeaves } from "../../../shared/richText/markTextLeaves.js";
import { referencesIn } from "../../../shared/richText/references.js";
import { withRelatedDocumentsAsIds } from "../../../shared/richText/relatedIds.js";
import { withSavedNodeFieldsOf } from "../../../shared/richText/savedNodeFields.js";
import { META_KEY } from "../../../shared/shared.js";

export type OptimisticField = { fieldAddress: string; meta: unknown };

export const optimisticValueOf = (
  state: unknown,
  { fieldAddress, meta }: OptimisticField,
  base: unknown
): VeEditorState | null => {
  if (!isEditorStateTree(state)) return null;
  const references = referencesIn(base);
  const placed = withSavedNodeFieldsOf(
    withBlockFieldsOf(withRelatedDocumentsAsIds(state), base),
    base
  );
  const populated = references.populate(placed);
  markTextLeaves(populated, fieldAddress);
  return { ...references.withoutUnresolved(populated), [META_KEY]: meta };
};
