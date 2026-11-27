import type { VeEditedField, VeMediaApiAnswer, VeMediaOptionsRequest } from "./protocol.js";

import { jsonOf } from "./endpointAnswer.js";
import { VE_MEDIA_OPTIONS_PATH } from "./protocol.js";

export interface MediaApi {
  list(request: VeMediaOptionsRequest): Promise<VeMediaApiAnswer>;
  upload(field: VeEditedField, collection: string, file: File): Promise<VeMediaApiAnswer>;
}

const UPLOADED_FILE_FIELD = "file";
const WITHOUT_RELATED_DOCUMENTS = "depth=0";

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
