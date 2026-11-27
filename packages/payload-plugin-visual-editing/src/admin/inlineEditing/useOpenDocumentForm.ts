import type { FormState, SanitizedDocumentPermissions } from "payload";

import { useConfig, useDocumentInfo, useForm, useFormModified, useLocale } from "@payloadcms/ui";
import { useEffect, useRef, useState } from "react";

import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";
import type { SaveRefusal } from "../../shared/fieldEdit.js";
import type {
  VeEditedField,
  VeFieldEditRefusedMessage,
  VeLiveDocument,
  VeMediaOptionsAnswerMessage,
  VeMediaPickCancelledMessage,
  VeMediaPickedMessage,
  VeMediaUploadAnswerMessage,
  VeRichTextStateMessage,
  VeRichTextStateRefusedMessage,
} from "../../shared/protocol.js";
import type { PreviewWindow } from "../instantPreview/usePreviewWindow.js";
import type { OpenForm } from "./formEdit.js";

import { VE_FIELD_EDIT_REFUSED_TYPE } from "../../shared/protocol.js";
import { isSameValue } from "../../shared/sameValue.js";
import { useEditableSchema } from "../instantPreview/useEditableSchema.js";
import { usePreviewWindow } from "../instantPreview/usePreviewWindow.js";
import { openDocumentOf } from "../openField/openDocument.js";

export type VeToldToThePage =
  | VeFieldEditRefusedMessage
  | VeMediaOptionsAnswerMessage
  | VeMediaPickCancelledMessage
  | VeMediaPickedMessage
  | VeMediaUploadAnswerMessage
  | VeRichTextStateMessage
  | VeRichTextStateRefusedMessage;

export type FormUpdate = { path: string; value: unknown; initialValue?: unknown };

export type HearPreviewPage = (
  message: unknown,
  document: VeLiveDocument,
  form: OpenDocumentForm
) => void;

export interface OpenDocumentForm {
  document(): VeLiveDocument | null;
  isOpen(): boolean;
  held<Held>(read: (form: OpenForm) => Held | null): Held | null;
  write(update: FormUpdate): void;
  tell(message: VeToldToThePage): void;
  refuse(field: VeEditedField, reason: SaveRefusal): void;
}

export type OpenDocument = { form: OpenDocumentForm; document: VeLiveDocument | null };

type OfTheLatestRender = {
  document: VeLiveDocument | null;
  isFormDisabled: boolean;
  editableSchema: EditableSchema;
  permissions: SanitizedDocumentPermissions | undefined;
  getFields(): FormState;
  write(update: FormUpdate): void;
  previewWindow: PreviewWindow;
  hear: HearPreviewPage;
};

type FormValues = Record<string, unknown>;

const valuesOf = (fields: FormState): FormValues =>
  Object.fromEntries(Object.entries(fields).map(([path, { value }]) => [path, value]));

export function useOpenDocumentForm(
  excludeFieldNames: string[] | undefined,
  hear: HearPreviewPage
): OpenDocument {
  const { disabled: isFormDisabled, dispatchFields, getFields, setModified } = useForm();
  const isModified = useFormModified();
  const valuesBeforeTheEdits = useRef<FormValues | null>(null);
  const { id, collectionSlug, docPermissions, globalSlug } = useDocumentInfo();
  const { getEntityConfig } = useConfig();
  const holdsAFile = Boolean(collectionSlug && getEntityConfig({ collectionSlug })?.upload);
  const editableSchema = useEditableSchema({ collectionSlug, globalSlug }, excludeFieldNames);
  const { code: locale } = useLocale();
  const previewWindow = usePreviewWindow();
  const latest = useRef<OfTheLatestRender | null>(null);
  const isHearing = useRef(false);
  const openDocument = openDocumentOf({ collectionSlug, globalSlug, id });
  const document = openDocument && { ...openDocument, locale };
  const isDocumentOpen = openDocument !== null;

  useEffect(() => {
    latest.current = {
      document,
      editableSchema,
      getFields,
      hear,
      isFormDisabled: Boolean(isFormDisabled),
      permissions: docPermissions,
      previewWindow,
      write: ({ initialValue, path, value }) => {
        const values = valuesOf(getFields());
        if (!isModified) valuesBeforeTheEdits.current = values;
        dispatchFields({
          path,
          type: "UPDATE",
          value,
          ...(initialValue !== undefined && { initialValue }),
        });
        const before = valuesBeforeTheEdits.current;
        const isAsBefore =
          !holdsAFile && before !== null && isSameValue({ ...values, [path]: value }, before);
        setModified(!isAsBefore);
      },
    };
  });

  const [form] = useState<OpenDocumentForm>(() => {
    const tell = (message: VeToldToThePage) => {
      const shown = latest.current?.previewWindow;
      if (shown?.origin) shown.getWindow()?.postMessage(message, shown.origin);
    };
    return {
      document: () => latest.current?.document ?? null,
      held(read) {
        const current = latest.current;
        if (!current?.document || current.isFormDisabled) return null;
        return read({
          document: current.document,
          editableSchema: current.editableSchema,
          formState: current.getFields(),
          permissions: current.permissions,
        });
      },
      isOpen: () => isHearing.current && Boolean(latest.current?.previewWindow.origin),
      refuse(field, reason) {
        tell({ ...field, reason, type: VE_FIELD_EDIT_REFUSED_TYPE });
      },
      tell,
      write: (update) => latest.current?.write(update),
    };
  });

  const { hear: hearPreviewWindow } = previewWindow;

  useEffect(() => {
    if (!isDocumentOpen) return;
    isHearing.current = true;
    const stopHearing = hearPreviewWindow((message) => {
      const current = latest.current;
      if (current?.document) current.hear(message, current.document, form);
    });
    return () => {
      isHearing.current = false;
      stopHearing();
    };
  }, [form, hearPreviewWindow, isDocumentOpen]);

  return { document, form };
}
