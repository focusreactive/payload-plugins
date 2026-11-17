"use client";

import { useDocumentInfo, useForm, useLocale } from "@payloadcms/ui";
import { useEffect } from "react";

import type {
  VeEditedField,
  VeFieldEditRefusedMessage,
  VeRichTextStateMessage,
  VeRichTextStateRefusedMessage,
} from "../../shared/protocol.js";
import type { OpenForm } from "./formEdit.js";

import { isMessageFrom } from "../../shared/messageSource.js";
import {
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_RICH_TEXT_STATE_REFUSED_TYPE,
  VE_RICH_TEXT_STATE_TYPE,
} from "../../shared/protocol.js";
import { useEditableSchema } from "../instantPreview/useEditableSchema.js";
import { usePreviewWindow } from "../instantPreview/usePreviewWindow.js";
import { openDocumentOf } from "../openField/openDocument.js";
import {
  formatsForThePage,
  richTextEditOfDocument,
  richTextFormEditOf,
  richTextOfForm,
  stateForThePage,
  stateRequestOfDocument,
} from "./richTextFormEdit.js";

export function RichTextEditReceiver({ excludeFieldNames }: { excludeFieldNames?: string[] }) {
  const { disabled: isFormDisabled, dispatchFields, getFields, setModified } = useForm();
  const { id, collectionSlug, globalSlug } = useDocumentInfo();
  const editableSchema = useEditableSchema({ collectionSlug, globalSlug }, excludeFieldNames);
  const { code: locale } = useLocale();
  const { getWindow, origin } = usePreviewWindow();

  useEffect(() => {
    const document = openDocumentOf({ collectionSlug, globalSlug, id });
    if (!document || !origin) return;
    const openDocument = { ...document, locale };

    const openForm = (): OpenForm | null =>
      isFormDisabled ? null : { document: openDocument, editableSchema, formState: getFields() };

    const refuseEdit = (field: VeEditedField) => {
      const message: VeFieldEditRefusedMessage = { ...field, type: VE_FIELD_EDIT_REFUSED_TYPE };
      getWindow()?.postMessage(message, origin);
    };

    const refuseStateRequest = (field: VeEditedField) => {
      const message: VeRichTextStateRefusedMessage = {
        ...field,
        type: VE_RICH_TEXT_STATE_REFUSED_TYPE,
      };
      getWindow()?.postMessage(message, origin);
    };

    const answerStateRequest = (field: VeEditedField) => {
      const form = openForm();
      const held = form && richTextOfForm(field, form);
      if (!held) {
        refuseStateRequest(field);
        return;
      }
      const message: VeRichTextStateMessage = {
        ...field,
        formats: formatsForThePage(held),
        state: stateForThePage(held),
        type: VE_RICH_TEXT_STATE_TYPE,
      };
      getWindow()?.postMessage(message, origin);
    };

    const writeEditIntoForm = (edit: NonNullable<ReturnType<typeof richTextEditOfDocument>>) => {
      const form = openForm();
      const formEdit = form && richTextFormEditOf(edit, form);
      if (!formEdit) {
        refuseEdit(edit.field);
        return;
      }
      const { path, value } = formEdit;
      dispatchFields({ initialValue: value, path, type: "UPDATE", value });
      setModified(true);
    };

    const hearPreviewPage = (event: MessageEvent) => {
      if (!isMessageFrom(event, origin, getWindow())) return;
      const asked = stateRequestOfDocument(event.data, openDocument);
      if (asked) answerStateRequest(asked);
      const edit = richTextEditOfDocument(event.data, openDocument);
      if (edit) writeEditIntoForm(edit);
    };

    window.addEventListener("message", hearPreviewPage);
    return () => window.removeEventListener("message", hearPreviewPage);
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
