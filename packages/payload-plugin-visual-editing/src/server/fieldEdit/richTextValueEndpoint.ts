import type { Endpoint, PayloadRequest } from "payload";

import { headersWithCors } from "payload";

import type { VeEditorState, VeRichTextValue } from "../../shared/protocol.js";

import { readEditedField } from "../../shared/fieldEdit.js";
import { VE_RICH_TEXT_VALUE_PATH } from "../../shared/protocol.js";
import { bodyOf } from "../endpointJson.js";
import {
  ANSWERED,
  draftFieldOf,
  FIELD_NOT_EDITABLE,
  inLocaleOfProject,
  isRefusal,
  SIGNED_OUT,
  statusOfFailure,
  UNREADABLE_REQUEST,
} from "./draftField.js";
import { shownRichTextOf } from "./editedField.js";

const answer = (value: VeEditorState | null, status: number, req: PayloadRequest): Response => {
  const body: VeRichTextValue = { value };
  return Response.json(body, {
    headers: headersWithCors({ headers: new Headers({ "Cache-Control": "no-store" }), req }),
    status,
  });
};

export const richTextValueEndpoint: Endpoint = {
  handler: async (req) => {
    const { payload, user } = req;
    if (!user) return answer(null, SIGNED_OUT, req);

    const posted = readEditedField(await bodyOf(req));
    if (!posted) return answer(null, UNREADABLE_REQUEST, req);
    const asked = inLocaleOfProject(payload, posted);

    try {
      const field = await draftFieldOf(payload, user, asked);
      if (isRefusal(field)) return answer(null, field.status, req);

      const value = shownRichTextOf(field.shown, field.schema, asked.key);
      return answer(value, value ? ANSWERED : FIELD_NOT_EDITABLE, req);
    } catch (error) {
      return answer(null, statusOfFailure(error), req);
    }
  },
  method: "post",
  path: VE_RICH_TEXT_VALUE_PATH,
};
