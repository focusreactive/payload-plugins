import type { MediaApi } from "../../shared/mediaApi.js";
import type {
  VeEditedField,
  VeMediaOption,
  VeMediaOptions,
  VeMediaOptionsRequest,
} from "../../shared/protocol.js";

import { NOT_EDITABLE, readSaveRefusal } from "../../shared/fieldEdit.js";
import { mediaOptionOf, readMediaOptions } from "../../shared/mediaOption.js";
import { isPlainObject } from "../../shared/plainObject.js";

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

export type MediaApiOf = (field: VeEditedField) => MediaApi;

export const UPLOAD_REFUSED = "The file could not be uploaded";

const firstErrorOf = (answer: unknown): string | null => {
  const errors = isPlainObject(answer) && Array.isArray(answer.errors) ? answer.errors : [];
  const [first]: unknown[] = errors;
  return isPlainObject(first) && typeof first.message === "string" ? first.message : null;
};

const createdMediaOf = (answer: unknown, descriptionField: string | null): VeMediaOption | null =>
  isPlainObject(answer) ? mediaOptionOf(answer.doc, descriptionField) : null;

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
