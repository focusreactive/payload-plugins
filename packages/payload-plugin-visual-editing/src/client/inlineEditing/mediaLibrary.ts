import type {
  VeEditedField,
  VeMediaApiAnswer,
  VeMediaOption,
  VeMediaOptions,
  VeMediaOptionsRequest,
} from "../../shared/protocol.js";

import { NOT_EDITABLE, readSaveRefusal } from "../../shared/fieldEdit.js";
import { mediaOptionOf, readMediaOptions } from "../../shared/mediaOption.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_MEDIA_OPTIONS_PATH } from "../../shared/protocol.js";
import { jsonOf } from "./endpointAnswer.js";

export type UploadAnswer = { media: VeMediaOption } | { error: string };

export const FIELD_REFUSED = "refused";

export type MediaListing = VeMediaOptions | typeof FIELD_REFUSED | null;

export interface MediaLibrary {
  list(request: VeMediaOptionsRequest): Promise<MediaListing>;
  upload(
    field: VeEditedField,
    collection: string,
    descriptionField: string | null,
    file: File
  ): Promise<UploadAnswer>;
}

export interface MediaApi {
  list(request: VeMediaOptionsRequest): Promise<VeMediaApiAnswer>;
  upload(field: VeEditedField, collection: string, file: File): Promise<VeMediaApiAnswer>;
}

export type MediaApiOf = (field: VeEditedField) => MediaApi;

export const UPLOAD_REFUSED = "The file could not be uploaded";

const UPLOADED_FILE_FIELD = "file";
const WITHOUT_RELATED_DOCUMENTS = "depth=0";

const firstErrorOf = (answer: unknown): string | null => {
  const errors = isPlainObject(answer) && Array.isArray(answer.errors) ? answer.errors : [];
  const [first]: unknown[] = errors;
  return isPlainObject(first) && typeof first.message === "string" ? first.message : null;
};

const createdMediaOf = (answer: unknown, descriptionField: string | null): VeMediaOption | null =>
  isPlainObject(answer) ? mediaOptionOf(answer.doc, descriptionField) : null;

const answerOf = async (response: Response): Promise<VeMediaApiAnswer> => ({
  answer: await jsonOf(response),
  ok: response.ok,
});

export const payloadMediaApi = (getPayloadApi: () => string, win: Window = window): MediaApi => ({
  async list(request) {
    return answerOf(
      await win.fetch(`${getPayloadApi()}${VE_MEDIA_OPTIONS_PATH}`, {
        body: JSON.stringify(request),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    );
  },
  async upload(_field, collection, file) {
    const body = new FormData();
    body.append(UPLOADED_FILE_FIELD, file);
    return answerOf(
      await win.fetch(`${getPayloadApi()}/${collection}?${WITHOUT_RELATED_DOCUMENTS}`, {
        body,
        credentials: "include",
        method: "POST",
      })
    );
  },
});

export function createMediaLibrary(apiOf: MediaApiOf): MediaLibrary {
  return {
    async list(request) {
      try {
        const { answer, ok } = await apiOf(request).list(request);
        if (ok) return readMediaOptions(answer);
        return readSaveRefusal(answer) === NOT_EDITABLE ? FIELD_REFUSED : null;
      } catch {
        return null;
      }
    },
    async upload(field, collection, descriptionField, file) {
      try {
        const { answer, ok } = await apiOf(field).upload(field, collection, file);
        const media = ok ? createdMediaOf(answer, descriptionField) : null;
        return media ? { media } : { error: firstErrorOf(answer) ?? UPLOAD_REFUSED };
      } catch {
        return { error: UPLOAD_REFUSED };
      }
    },
  };
}
