"use client";

import {
  useAllFormFields,
  useDocumentInfo,
  useForm,
  useFormModified,
  useLocale,
} from "@payloadcms/ui";
import { useLayoutEffect, useRef } from "react";

import { editedPathsIn, fieldsMissingEditMark, hasUnsavedEdits } from "./editedFields";

export function PreserveAutosaveEdits() {
  const [fields, dispatchFields] = useAllFormFields();
  const { data: savedDoc } = useDocumentInfo();
  const { setModified } = useForm();
  const modified = useFormModified();
  const { code: localeCode } = useLocale();
  const editedPathsRef = useRef(new Set<string>());
  const lastCheckedDocRef = useRef(savedDoc);

  useLayoutEffect(() => {
    editedPathsRef.current.clear();
  }, [localeCode]);

  useLayoutEffect(() => {
    for (const path of editedPathsIn(fields)) {
      editedPathsRef.current.add(path);
    }

    const remarked = fieldsMissingEditMark(fields, editedPathsRef.current);
    if (Object.keys(remarked).length > 0) {
      dispatchFields({ formState: remarked, type: "UPDATE_MANY" });
    }
  }, [fields, dispatchFields]);

  useLayoutEffect(() => {
    if (savedDoc === lastCheckedDocRef.current) {
      return;
    }
    lastCheckedDocRef.current = savedDoc;

    if (!modified && savedDoc && hasUnsavedEdits(fields, editedPathsRef.current, savedDoc)) {
      setModified(true);
    }
  }, [fields, modified, savedDoc, setModified]);

  return null;
}
