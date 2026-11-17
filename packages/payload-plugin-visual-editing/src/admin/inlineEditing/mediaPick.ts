import type { VeEditedField, VeLiveDocument } from "../../shared/protocol.js";
import type { OpenForm } from "./formEdit.js";

import { uploadCollectionAt } from "../../shared/editableSchema/editableSchema.js";
import { readEditedField } from "../../shared/fieldEdit.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { VE_PICK_MEDIA_TYPE } from "../../shared/protocol.js";
import { documentAddressOf } from "../../shared/veDocument.js";
import { readFormFields } from "../instantPreview/formFields.js";
import { isOfAnotherLocale } from "./formEdit.js";

export type MediaPick = { collection: string; field: VeEditedField; path: string };

type FetchMedia = (url: string, init: RequestInit) => Promise<Response>;

const WITHOUT_RELATED_DOCUMENTS = "depth=0";

export function pickOfDocument(data: unknown, document: VeLiveDocument): VeEditedField | null {
  if (!isPlainObject(data) || data.type !== VE_PICK_MEDIA_TYPE) return null;
  const field = readEditedField(data);
  return field && documentAddressOf(field) === documentAddressOf(document) ? field : null;
}

export function mediaPickOf(
  field: VeEditedField,
  { document, editableSchema, formState }: OpenForm
): MediaPick | null {
  if (isOfAnotherLocale(field.locale, document.locale)) return null;

  const takesOneUpload: Parameters<typeof readFormFields>[2] = (schema, steps) =>
    uploadCollectionAt(schema, steps) !== null;
  const formField = readFormFields(formState, editableSchema, takesOneUpload).find(
    ({ key }) => key === field.key
  );
  const collection = formField && uploadCollectionAt(editableSchema, formField.steps);
  return formField && collection ? { collection, field, path: formField.formPath } : null;
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
