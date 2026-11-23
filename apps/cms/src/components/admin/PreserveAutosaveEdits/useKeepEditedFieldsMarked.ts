import { useAllFormFields } from "@payloadcms/ui";
import type { RefObject } from "react";
import { useLayoutEffect, useRef } from "react";

import { editedPathsIn, fieldsMissingEditMark } from "./editedFields";

export function useKeepEditedFieldsMarked(): RefObject<Set<string>> {
  const [fields, dispatchFields] = useAllFormFields();
  const editedPathsRef = useRef(new Set<string>());

  useLayoutEffect(() => {
    for (const path of editedPathsIn(fields)) {
      editedPathsRef.current.add(path);
    }

    const remarked = fieldsMissingEditMark(fields, editedPathsRef.current);
    if (Object.keys(remarked).length > 0) {
      dispatchFields({ formState: remarked, type: "UPDATE_MANY" });
    }
  }, [fields, dispatchFields]);

  return editedPathsRef;
}
