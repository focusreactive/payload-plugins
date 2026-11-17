import type {
  VeMediaOption,
  VeMediaOptions,
  VeMediaOptionsRequest,
} from "../../shared/protocol.js";

import { mediaOptionOf, readMediaOptions } from "../../shared/mediaOption.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_MEDIA_OPTIONS_PATH } from "../../shared/protocol.js";

export type UploadAnswer = { media: VeMediaOption } | { error: string };

export const FIELD_REFUSED = "refused";

export type MediaListing = VeMediaOptions | typeof FIELD_REFUSED | null;

export interface MediaLibrary {
  list(request: VeMediaOptionsRequest): Promise<MediaListing>;
  upload(collection: string, file: File): Promise<UploadAnswer>;
}

export const UPLOAD_REFUSED = "The file could not be uploaded";

const FIELD_NOT_EDITABLE = 422;
const UPLOADED_FILE_FIELD = "file";
const WITHOUT_RELATED_DOCUMENTS = "depth=0";

const jsonOf = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const firstErrorOf = (answer: unknown): string | null => {
  const errors = isPlainObject(answer) && Array.isArray(answer.errors) ? answer.errors : [];
  const [first]: unknown[] = errors;
  return isPlainObject(first) && typeof first.message === "string" ? first.message : null;
};

const createdMediaOf = (answer: unknown): VeMediaOption | null =>
  isPlainObject(answer) ? mediaOptionOf(answer.doc, true) : null;

export function createMediaLibrary(
  getPayloadApi: () => string,
  win: Window = window
): MediaLibrary {
  return {
    async list(request) {
      try {
        const response = await win.fetch(`${getPayloadApi()}${VE_MEDIA_OPTIONS_PATH}`, {
          body: JSON.stringify(request),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (response.status === FIELD_NOT_EDITABLE) return FIELD_REFUSED;
        return response.ok ? readMediaOptions(await jsonOf(response)) : null;
      } catch {
        return null;
      }
    },
    async upload(collection, file) {
      const body = new FormData();
      body.append(UPLOADED_FILE_FIELD, file);
      try {
        const response = await win.fetch(
          `${getPayloadApi()}/${collection}?${WITHOUT_RELATED_DOCUMENTS}`,
          { body, credentials: "include", method: "POST" }
        );
        const answer = await jsonOf(response);
        const media = response.ok ? createdMediaOf(answer) : null;
        return media ? { media } : { error: firstErrorOf(answer) ?? UPLOAD_REFUSED };
      } catch {
        return { error: UPLOAD_REFUSED };
      }
    },
  };
}
