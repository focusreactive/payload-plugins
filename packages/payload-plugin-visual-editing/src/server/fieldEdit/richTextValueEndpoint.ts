import type { Endpoint } from "payload";

import type { VeRichTextValue } from "../../shared/protocol.js";
import type { DraftField } from "./draftField.js";

import { readEditedField } from "../../shared/fieldEdit.js";
import { VE_RICH_TEXT_VALUE_PATH } from "../../shared/protocol.js";
import { formatsIn, NO_FORMATS, withFormats } from "../../shared/richText/formats.js";
import { draftFieldEndpoint, FIELD_NOT_EDITABLE } from "./draftField.js";
import { missingRowOf, shownRichTextOf } from "./editedField.js";
import { formatsOfField } from "./richTextFormats.js";

const NOTHING_TO_EDIT: VeRichTextValue = { formats: null, value: null };

const isRowNotSavedYet = async (
  { heldRowBefore, readStored, schema, shown }: DraftField,
  key: string
): Promise<boolean> => {
  if (!missingRowOf(shown, schema, key)) return false;
  const missing = missingRowOf(await readStored(), schema, key);
  return missing !== null && !(await heldRowBefore(missing));
};

export const richTextValueEndpoint: Endpoint = draftFieldEndpoint({
  answer: async (field, asked, { payload }) => {
    const { document, schema, shown } = field;
    const shownRichText = shownRichTextOf(shown, schema, asked.key);
    if (!shownRichText) {
      return (await isRowNotSavedYet(field, asked.key)) ? NOTHING_TO_EDIT : FIELD_NOT_EDITABLE;
    }
    const ofEditor = formatsOfField(payload, document, shownRichText.steps) ?? NO_FORMATS;
    const formats = withFormats(ofEditor, formatsIn(shownRichText.value));
    return { formats, value: shownRichText.value };
  },
  path: VE_RICH_TEXT_VALUE_PATH,
  readAsked: readEditedField,
  refusedAnswer: NOTHING_TO_EDIT,
});
