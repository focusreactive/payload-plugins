import type { FormState } from "payload";

import type { VeEditedField, VeLiveDocument } from "../../shared/protocol.js";
import type { OpenForm } from "./formEdit.js";

import { uploadCollectionAt } from "../../shared/editableSchema/editableSchema.js";
import { readEditedField } from "../../shared/fieldEdit.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_PICK_MEDIA_TYPE } from "../../shared/protocol.js";
import { documentAddressOf, idOf } from "../../shared/veDocument.js";
import { readFormFields } from "../instantPreview/formFields.js";
import { isOfAnotherLocale, updatableFormFieldOf } from "./formEdit.js";

export type MediaPick = { collection: string; field: VeEditedField; path: string };

type FetchMedia = (url: string, init: RequestInit) => Promise<Response>;

const WITHOUT_RELATED_DOCUMENTS = "depth=0";

export function pickOfDocument(data: unknown, document: VeLiveDocument): VeEditedField | null {
  if (!isPlainObject(data) || data.type !== VE_PICK_MEDIA_TYPE) return null;
  const field = readEditedField(data);
  return field && documentAddressOf(field) === documentAddressOf(document) ? field : null;
}

export const chosenMediaOf = (data: unknown): number | string | null =>
  isPlainObject(data) ? idOf(data.mediaId) : null;

const filtersWhatItTakes = (formState: FormState, formPath: string): boolean =>
  formState[formPath]?.filterOptions !== undefined;

export function mediaPickOf(field: VeEditedField, openForm: OpenForm): MediaPick | null {
  if (isOfAnotherLocale(field.locale, openForm.document.locale)) return null;

  const takesOneUpload: Parameters<typeof readFormFields>[2] = (schema, steps) =>
    uploadCollectionAt(schema, steps) !== null;
  const formField = updatableFormFieldOf(field.key, openForm, takesOneUpload);
  const collection = formField && uploadCollectionAt(openForm.editableSchema, formField.steps);
  if (!formField || !collection || filtersWhatItTakes(openForm.formState, formField.formPath)) {
    return null;
  }
  return { collection, field, path: formField.formPath };
}

export async function fetchPickedMedia(
  apiUrl: string,
  collection: string,
  id: number | string,
  fetchMedia: FetchMedia = fetch
): Promise<unknown> {
  try {
    const response = await fetchMedia(
      `${apiUrl}/${collection}/${encodeURIComponent(id)}?${WITHOUT_RELATED_DOCUMENTS}`,
      { credentials: "include" }
    );
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
