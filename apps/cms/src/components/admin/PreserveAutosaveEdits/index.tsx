"use client";

import { useAllFormFields, useDocumentInfo, useForm, useFormModified } from "@payloadcms/ui";
import { useLayoutEffect, useRef } from "react";

import { editedPathsIn, fieldsMissingEditMark, hasUnsavedEdits } from "./editedFields";

export function PreserveAutosaveEdits() {
  const [fields, dispatchFields] = useAllFormFields();
  const { data: savedDoc } = useDocumentInfo();
  const { setModified } = useForm();
  const modified = useFormModified();
  const editedPaths = useRef(new Set<string>());

  useLayoutEffect(() => {
    for (const path of editedPathsIn(fields)) {
      editedPaths.current.add(path);
    }

    const remarked = fieldsMissingEditMark(fields, editedPaths.current);
    if (Object.keys(remarked).length > 0) {
      dispatchFields({ formState: remarked, type: "UPDATE_MANY" });
    }
  }, [fields, dispatchFields]);

  useLayoutEffect(() => {
    if (!modified && savedDoc && hasUnsavedEdits(fields, editedPaths.current, savedDoc)) {
      setModified(true);
    }
  }, [fields, modified, savedDoc, setModified]);

  return null;
}
