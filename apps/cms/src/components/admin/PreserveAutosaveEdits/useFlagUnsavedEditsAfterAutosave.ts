import { useAllFormFields, useDocumentInfo, useForm, useFormModified } from "@payloadcms/ui";
import type { RefObject } from "react";
import { useLayoutEffect, useRef } from "react";

import { hasUnsavedEdits } from "./editedFields";

export function useFlagUnsavedEditsAfterAutosave(editedPathsRef: RefObject<Set<string>>) {
  const [fields] = useAllFormFields();
  const { data: savedDoc } = useDocumentInfo();
  const { setModified } = useForm();
  const modified = useFormModified();
  const lastCheckedDocRef = useRef(savedDoc);

  useLayoutEffect(() => {
    if (savedDoc === lastCheckedDocRef.current) {
      return;
    }
    lastCheckedDocRef.current = savedDoc;

    if (!modified && savedDoc && hasUnsavedEdits(fields, editedPathsRef.current, savedDoc)) {
      setModified(true);
    }
  }, [editedPathsRef, fields, modified, savedDoc, setModified]);
}
