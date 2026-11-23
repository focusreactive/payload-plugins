"use client";

import { useConfig, useDocumentInfo, useForm, useLocale } from "@payloadcms/ui";
import { useEffect, useRef } from "react";

import type { VeRichTextFormats } from "../../shared/richText/formats.js";

import type {
  VeEditedField,
  VeFieldEditRefusedMessage,
  VeRichTextStateMessage,
  VeRichTextStateRefusedMessage,
} from "../../shared/protocol.js";
import type { OpenForm } from "./formEdit.js";

import { NOT_EDITABLE } from "../../shared/fieldEdit.js";
import { isMessageFrom } from "../../shared/messageSource.js";
import {
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_RICH_TEXT_STATE_REFUSED_TYPE,
  VE_RICH_TEXT_STATE_REQUEST_TYPE,
  VE_RICH_TEXT_STATE_TYPE,
} from "../../shared/protocol.js";
import { useEditableSchema } from "../instantPreview/useEditableSchema.js";
import { usePreviewWindow } from "../instantPreview/usePreviewWindow.js";
import { openDocumentOf } from "../openField/openDocument.js";
import {
  allowedFormatsOf,
  createRunningEdits,
  endedEditOfDocument,
  fetchEditorFormatsFrom,
  richTextEditOfDocument,
  richTextFormEditOf,
  richTextOfForm,
  stateForThePage,
  stateRequestOfDocument,
} from "./richTextFormEdit.js";

type AnswerWithFormats = (field: VeEditedField, ofEditor: VeRichTextFormats | null) => void;

export function RichTextEditReceiver({ excludeFieldNames }: { excludeFieldNames?: string[] }) {
  const { disabled: isFormDisabled, dispatchFields, getFields, setModified } = useForm();
  const { id, collectionSlug, docPermissions, globalSlug } = useDocumentInfo();
  const editableSchema = useEditableSchema({ collectionSlug, globalSlug }, excludeFieldNames);
  const { code: locale } = useLocale();
  const { getWindow, origin } = usePreviewWindow();
  const runningEdits = useRef(createRunningEdits()).current;
  const answerWithFormats = useRef<AnswerWithFormats | null>(null);
  const { config } = useConfig();
  const apiUrl = `${config.serverURL}${config.routes.api}`;

  useEffect(
    () => () => runningEdits.forget(),
    [collectionSlug, globalSlug, id, locale, runningEdits]
  );

  useEffect(() => {
    const document = openDocumentOf({ collectionSlug, globalSlug, id });
    if (!document || !origin) return;
    const openDocument = { ...document, locale };
    const editorFormatsOf = fetchEditorFormatsFrom(apiUrl);

    const openForm = (): OpenForm | null =>
      isFormDisabled
        ? null
        : {
            document: openDocument,
            editableSchema,
            formState: getFields(),
            permissions: docPermissions,
          };

    const refuseEdit = (field: VeEditedField) => {
      const message: VeFieldEditRefusedMessage = {
        ...field,
        reason: NOT_EDITABLE,
        type: VE_FIELD_EDIT_REFUSED_TYPE,
      };
      getWindow()?.postMessage(message, origin);
    };

    const refuseStateRequest = (field: VeEditedField) => {
      const message: VeRichTextStateRefusedMessage = {
        ...field,
        reason: NOT_EDITABLE,
        type: VE_RICH_TEXT_STATE_REFUSED_TYPE,
      };
      getWindow()?.postMessage(message, origin);
    };

    const heldInForm = (field: VeEditedField) => {
      const form = openForm();
      return form && richTextOfForm(field, form);
    };

    const answer: AnswerWithFormats = (field, ofEditor) => {
      if (
        !stateRequestOfDocument({ ...field, type: VE_RICH_TEXT_STATE_REQUEST_TYPE }, openDocument)
      ) {
        return;
      }
      const held = heldInForm(field);
      if (!held) {
        refuseStateRequest(field);
        return;
      }
      const formats = allowedFormatsOf(held, ofEditor);
      runningEdits.answered(field, { formats, state: held.value });
      const message: VeRichTextStateMessage = {
        ...field,
        formats,
        state: stateForThePage(held),
        type: VE_RICH_TEXT_STATE_TYPE,
      };
      getWindow()?.postMessage(message, origin);
    };
    answerWithFormats.current = answer;

    const answerStateRequest = async (field: VeEditedField) => {
      const ofEditor = heldInForm(field) ? await editorFormatsOf(field) : null;
      answerWithFormats.current?.(field, ofEditor);
    };

    const writeEditIntoForm = (edit: NonNullable<ReturnType<typeof richTextEditOfDocument>>) => {
      const form = openForm();
      const formEdit = form && richTextFormEditOf(edit, form, runningEdits.beginningOf(edit.field));
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
      if (asked) void answerStateRequest(asked);
      const edit = richTextEditOfDocument(event.data, openDocument);
      if (edit) writeEditIntoForm(edit);
      const ended = endedEditOfDocument(event.data, openDocument);
      if (ended) runningEdits.ended(ended);
    };

    window.addEventListener("message", hearPreviewPage);
    return () => {
      if (answerWithFormats.current === answer) answerWithFormats.current = null;
      window.removeEventListener("message", hearPreviewPage);
    };
  }, [
    apiUrl,
    collectionSlug,
    dispatchFields,
    docPermissions,
    editableSchema,
    getFields,
    getWindow,
    globalSlug,
    id,
    isFormDisabled,
    locale,
    origin,
    runningEdits,
    setModified,
  ]);

  return null;
}
