"use client";

import { NOT_EDITABLE } from "../../shared/fieldEdit.js";
import { editOfDocument, formEditOf } from "./formEdit.js";
import { useOpenDocumentForm } from "./useOpenDocumentForm.js";

export function InlineEditReceiver({ excludeFieldNames }: { excludeFieldNames?: string[] }) {
  useOpenDocumentForm(excludeFieldNames, (message, document, form) => {
    const edit = editOfDocument(message, document);
    if (!edit) return;
    const formEdit = form.held((open) => formEditOf(edit, open));
    if (!formEdit) {
      const { value: _value, ...refused } = edit;
      form.refuse(refused, NOT_EDITABLE);
      return;
    }
    form.write(formEdit);
  });

  return null;
}
