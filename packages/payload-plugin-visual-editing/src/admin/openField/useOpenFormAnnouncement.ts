import { useDocumentInfo, useForm } from "@payloadcms/ui";
import { useContext, useEffect } from "react";

import { openDocumentOf } from "./openDocument.js";
import { OpenFormsContext } from "./openForms.js";

export function useOpenFormAnnouncement(): void {
  const { getFields } = useForm();
  const { id, collectionSlug, globalSlug } = useDocumentInfo();
  const announceOpenForm = useContext(OpenFormsContext);

  useEffect(() => {
    const document = openDocumentOf({ collectionSlug, globalSlug, id });
    if (!document) return;
    return announceOpenForm({ document, readFormState: getFields });
  }, [announceOpenForm, collectionSlug, getFields, globalSlug, id]);
}
