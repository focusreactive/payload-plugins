"use client";

import { useDocumentInfo, useForm, useLocale } from "@payloadcms/ui";
import { useEffect } from "react";

import { isMessageFrom } from "../../shared/messageSource.js";
import { useEditableSchema } from "../instantPreview/useEditableSchema.js";
import { usePreviewWindow } from "../instantPreview/usePreviewWindow.js";
import { openDocumentOf } from "../openField/openDocument.js";
import { formEditOf } from "./formEdit.js";

export function InlineEditReceiver({ excludeFieldNames }: { excludeFieldNames?: string[] }) {
  const { dispatchFields, getFields, setModified } = useForm();
  const { id, collectionSlug, globalSlug } = useDocumentInfo();
  const editableSchema = useEditableSchema({ collectionSlug, globalSlug }, excludeFieldNames);
  const { code: locale } = useLocale();
  const { getWindow, origin } = usePreviewWindow();

  useEffect(() => {
    const document = openDocumentOf({ collectionSlug, globalSlug, id });
    if (!document || !origin) return;

    const writeEditIntoForm = (event: MessageEvent) => {
      if (!isMessageFrom(event, origin, getWindow())) return;
      const edit = formEditOf(event.data, {
        document: { ...document, locale },
        editableSchema,
        formState: getFields(),
      });
      if (!edit) return;
      dispatchFields({ path: edit.path, type: "UPDATE", value: edit.value });
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
    locale,
    origin,
    setModified,
  ]);

  return null;
}
