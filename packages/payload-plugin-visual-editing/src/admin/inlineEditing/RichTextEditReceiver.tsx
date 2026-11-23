"use client";

import { useConfig } from "@payloadcms/ui";
import { useEffect, useRef } from "react";

import type { VeEditedField } from "../../shared/protocol.js";
import type { PostedRichTextEdit } from "./richTextFormEdit.js";
import type { OpenDocumentForm } from "./useOpenDocumentForm.js";

import { NOT_EDITABLE } from "../../shared/fieldEdit.js";
import { VE_RICH_TEXT_STATE_REFUSED_TYPE, VE_RICH_TEXT_STATE_TYPE } from "../../shared/protocol.js";
import { documentAddressOf } from "../../shared/veDocument.js";
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
import { useOpenDocumentForm } from "./useOpenDocumentForm.js";

export function RichTextEditReceiver({ excludeFieldNames }: { excludeFieldNames?: string[] }) {
  const runningEdits = useRef(createRunningEdits()).current;
  const { config } = useConfig();
  const editorFormatsOf = fetchEditorFormatsFrom(`${config.serverURL}${config.routes.api}`);

  const heldInForm = (form: OpenDocumentForm, field: VeEditedField) =>
    form.held((open) => richTextOfForm(field, open));

  const answer = async (form: OpenDocumentForm, field: VeEditedField) => {
    const ofEditor = heldInForm(form, field) ? await editorFormatsOf(field) : null;
    const document = form.document();
    const isStillOpen = document && documentAddressOf(document) === documentAddressOf(field);
    if (!form.isOpen() || !isStillOpen) return;
    const held = heldInForm(form, field);
    if (!held) {
      form.tell({ ...field, reason: NOT_EDITABLE, type: VE_RICH_TEXT_STATE_REFUSED_TYPE });
      return;
    }
    const formats = allowedFormatsOf(held, ofEditor);
    runningEdits.answered(field, { formats, state: held.value });
    form.tell({ ...field, formats, state: stateForThePage(held), type: VE_RICH_TEXT_STATE_TYPE });
  };

  const writeEditIntoForm = (form: OpenDocumentForm, edit: PostedRichTextEdit) => {
    const formEdit = form.held((open) =>
      richTextFormEditOf(edit, open, runningEdits.beginningOf(edit.field))
    );
    if (!formEdit) {
      form.refuse(edit.field, NOT_EDITABLE);
      return;
    }
    form.write({ initialValue: formEdit.value, ...formEdit });
  };

  const { document } = useOpenDocumentForm(excludeFieldNames, (message, open, form) => {
    const asked = stateRequestOfDocument(message, open);
    if (asked) void answer(form, asked);
    const edit = richTextEditOfDocument(message, open);
    if (edit) writeEditIntoForm(form, edit);
    const ended = endedEditOfDocument(message, open);
    if (ended) runningEdits.ended(ended);
  });

  const { collectionSlug, docId, kind, locale } = document ?? {};

  useEffect(() => () => runningEdits.forget(), [collectionSlug, docId, kind, locale, runningEdits]);

  return null;
}
