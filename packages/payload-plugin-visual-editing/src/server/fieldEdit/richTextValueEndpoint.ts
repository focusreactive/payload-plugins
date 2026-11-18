import type { Endpoint, PayloadRequest } from "payload";

import { headersWithCors } from "payload";

import type { VeRichTextValue } from "../../shared/protocol.js";

import { readEditedField } from "../../shared/fieldEdit.js";
import { VE_RICH_TEXT_VALUE_PATH } from "../../shared/protocol.js";
import { formatsIn, NO_FORMATS, withFormats } from "../../shared/richText/formats.js";
import { jsonBodyOf } from "../endpointJson.js";
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
import { formatsOfField } from "./richTextFormats.js";

const NOTHING_TO_EDIT: VeRichTextValue = { formats: null, value: null };

const answer = (body: VeRichTextValue, status: number, req: PayloadRequest): Response => {
  return Response.json(body, {
    headers: headersWithCors({ headers: new Headers({ "Cache-Control": "no-store" }), req }),
    status,
  });
};

export const richTextValueEndpoint: Endpoint = {
  handler: async (req) => {
    const { payload, user } = req;
    if (!user) return answer(NOTHING_TO_EDIT, SIGNED_OUT, req);

    const posted = readEditedField(await jsonBodyOf(req));
    if (!posted) return answer(NOTHING_TO_EDIT, UNREADABLE_REQUEST, req);
    const asked = inLocaleOfProject(payload, posted);

    try {
      const field = await draftFieldOf(payload, user, asked);
      if (isRefusal(field)) return answer(NOTHING_TO_EDIT, field.status, req);

      const shown = shownRichTextOf(field.shown, field.schema, asked.key);
      if (!shown) return answer(NOTHING_TO_EDIT, FIELD_NOT_EDITABLE, req);
      const ofEditor = formatsOfField(payload, field.document, shown.steps) ?? NO_FORMATS;
      const formats = withFormats(ofEditor, formatsIn(shown.value));
      return answer({ formats, value: shown.value }, ANSWERED, req);
    } catch (error) {
      return answer(NOTHING_TO_EDIT, statusOfFailure(error), req);
    }
  },
  method: "post",
  path: VE_RICH_TEXT_VALUE_PATH,
};
