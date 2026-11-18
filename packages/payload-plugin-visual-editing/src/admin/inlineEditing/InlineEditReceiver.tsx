"use client";

import { useDocumentInfo, useForm, useLocale } from "@payloadcms/ui";
import { useEffect } from "react";

import type { VeFieldEditRefusedMessage } from "../../shared/protocol.js";

import { isMessageFrom } from "../../shared/messageSource.js";
import { VE_FIELD_EDIT_REFUSED_TYPE } from "../../shared/protocol.js";
import { useEditableSchema } from "../instantPreview/useEditableSchema.js";
import { usePreviewWindow } from "../instantPreview/usePreviewWindow.js";
import { openDocumentOf } from "../openField/openDocument.js";
import { editOfDocument, formEditOf } from "./formEdit.js";

export function InlineEditReceiver({ excludeFieldNames }: { excludeFieldNames?: string[] }) {
  const { disabled: isFormDisabled, dispatchFields, getFields, setModified } = useForm();
  const { id, collectionSlug, globalSlug } = useDocumentInfo();
  const editableSchema = useEditableSchema({ collectionSlug, globalSlug }, excludeFieldNames);
  const { code: locale } = useLocale();
  const { getWindow, origin } = usePreviewWindow();

  useEffect(() => {
    const document = openDocumentOf({ collectionSlug, globalSlug, id });
    if (!document || !origin) return;

    const writeEditIntoForm = (event: MessageEvent) => {
      if (!isMessageFrom(event, origin, getWindow())) return;
      const openDocument = { ...document, locale };
      const edit = editOfDocument(event.data, openDocument);
      if (!edit) return;
      const formEdit = isFormDisabled
        ? null
        : formEditOf(edit, { document: openDocument, editableSchema, formState: getFields() });
      if (!formEdit) {
        const { value: _value, ...refused } = edit;
        const message: VeFieldEditRefusedMessage = { ...refused, type: VE_FIELD_EDIT_REFUSED_TYPE };
        getWindow()?.postMessage(message, origin);
        return;
      }
      dispatchFields({ path: formEdit.path, type: "UPDATE", value: formEdit.value });
      setModified(true);
    };

    window.addEventListener("message", writeEditIntoForm);
    return () => window.removeEventListener("message", writeEditIntoForm);
  }, [
    collectionSlug,
    dispatchFields,
    editableSchema,
    getFields,
    getWindow,
    globalSlug,
    id,
    isFormDisabled,
    locale,
    origin,
    setModified,
  ]);

  return null;
}
