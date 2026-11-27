import type {
  VeEditedField,
  VeLiveDocument,
  VeMediaApiAnswer,
  VeMediaOptionsAnswerMessage,
  VeMediaOptionsRequest,
  VeMediaUploadAnswerMessage,
} from "../../shared/protocol.js";
import type { MediaApi } from "../../client/inlineEditing/mediaLibrary.js";
import type { OpenDocumentForm } from "./useOpenDocumentForm.js";

import { NOT_EDITABLE, readEditedField } from "../../shared/fieldEdit.js";
import { isPlainObject } from "../../shared/plainObject.js";
import {
  VE_MEDIA_OPTIONS_ANSWER_TYPE,
  VE_MEDIA_OPTIONS_REQUEST_TYPE,
  VE_MEDIA_UPLOAD_ANSWER_TYPE,
  VE_MEDIA_UPLOAD_TYPE,
} from "../../shared/protocol.js";
import { documentAddressOf } from "../../shared/veDocument.js";
import { mediaPickOf } from "./mediaPick.js";

type Asked = { requestId: string; field: VeEditedField };

export type MediaLibraryRequest =
  | (Asked & { type: typeof VE_MEDIA_OPTIONS_REQUEST_TYPE; options: VeMediaOptionsRequest })
  | (Asked & { type: typeof VE_MEDIA_UPLOAD_TYPE; collection: string; file: File });

const REFUSED: VeMediaApiAnswer = { answer: { reason: NOT_EDITABLE }, ok: false };

const UNANSWERED: VeMediaApiAnswer = { answer: null, ok: false };

export function mediaLibraryRequestOf(
  data: unknown,
  document: VeLiveDocument
): MediaLibraryRequest | null {
  const field = readEditedField(data);
  if (!field || !isPlainObject(data) || typeof data.requestId !== "string") return null;
  if (documentAddressOf(field) !== documentAddressOf(document)) return null;
  const { page, requestId, search } = data;
  if (
    data.type === VE_MEDIA_OPTIONS_REQUEST_TYPE &&
    typeof page === "number" &&
    typeof search === "string"
  ) {
    return { field, options: { ...field, page, search }, requestId, type: data.type };
  }
  if (
    data.type === VE_MEDIA_UPLOAD_TYPE &&
    typeof data.collection === "string" &&
    data.file instanceof File
  ) {
    return { collection: data.collection, field, file: data.file, requestId, type: data.type };
  }
  return null;
}

const askedOf = async (request: MediaLibraryRequest, api: MediaApi) => {
  try {
    if (request.type === VE_MEDIA_UPLOAD_TYPE) {
      return await api.upload(request.field, request.collection, request.file);
    }
    return await api.list(request.options);
  } catch {
    return UNANSWERED;
  }
};

export async function answerMediaLibraryRequest(
  request: MediaLibraryRequest,
  form: OpenDocumentForm,
  api: MediaApi
): Promise<void> {
  const tell = (answer: VeMediaApiAnswer) => {
    const message: VeMediaOptionsAnswerMessage | VeMediaUploadAnswerMessage =
      request.type === VE_MEDIA_UPLOAD_TYPE
        ? { ...answer, requestId: request.requestId, type: VE_MEDIA_UPLOAD_ANSWER_TYPE }
        : { ...answer, requestId: request.requestId, type: VE_MEDIA_OPTIONS_ANSWER_TYPE };
    form.tell(message);
  };
  const collection = form.held((open) => mediaPickOf(request.field, open))?.collection;
  const isTaken =
    collection !== undefined &&
    (request.type !== VE_MEDIA_UPLOAD_TYPE || request.collection === collection);
  tell(isTaken ? await askedOf(request, api) : REFUSED);
}
