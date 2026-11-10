"use client";

import { useFlagUnsavedEditsAfterAutosave } from "./useFlagUnsavedEditsAfterAutosave";
import { useKeepEditedFieldsMarked } from "./useKeepEditedFieldsMarked";

export function PreserveAutosaveEdits() {
  const editedPathsRef = useKeepEditedFieldsMarked();
  useFlagUnsavedEditsAfterAutosave(editedPathsRef);

  return null;
}
