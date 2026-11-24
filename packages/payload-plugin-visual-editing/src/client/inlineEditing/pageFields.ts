import type { VeDocument, VeEditedField } from "../../shared/protocol.js";
import type { VeIdentity } from "../../shared/shared.js";

import { fieldKeyOfMarker } from "../../shared/fieldKey.js";
import { editedFieldAddressOf, veDocumentOf } from "../../shared/veDocument.js";

export type OpenForms = {
  holdsValueOf(document: VeDocument, key: string): boolean;
  holdsFormOf(document: VeDocument): boolean;
  holdsAnyForm(): boolean;
};

export type PageFieldKind = "text" | "image" | "rich-text";

export type NotEditableHere = "no-field-key" | "read-in-every-locale" | "form-not-open";

export type PageField = { field: VeEditedField; address: string };

export type PageFieldAnswer = PageField | { notEditable: NotEditableHere };

export type PageFieldsDeps = {
  getLocale(): string | undefined;
  openForms: OpenForms | null;
  isNextToAdmin(): boolean;
};

export interface PageFields {
  fieldOf(marker: VeIdentity): PageFieldAnswer;
  editableFieldOf(marker: VeIdentity, kind: PageFieldKind): PageFieldAnswer;
}

export const isPageField = (answer: PageFieldAnswer): answer is PageField => "field" in answer;

export function createPageFields({
  getLocale,
  isNextToAdmin,
  openForms,
}: PageFieldsDeps): PageFields {
  const fieldOf = (marker: VeIdentity): PageFieldAnswer => {
    const key = fieldKeyOfMarker(marker);
    if (key === null) return { notEditable: "no-field-key" };
    if (marker.locale !== undefined) return { notEditable: "read-in-every-locale" };
    const locale = getLocale();
    const field = { ...veDocumentOf(marker), key, ...(locale !== undefined && { locale }) };
    return { address: editedFieldAddressOf(field), field };
  };

  const holdsTheFormOf = ({ field }: PageField, kind: PageFieldKind): boolean => {
    if (!openForms) return false;
    const document = veDocumentOf(field);
    return kind === "text"
      ? openForms.holdsValueOf(document, field.key)
      : openForms.holdsFormOf(document);
  };

  return {
    editableFieldOf(marker, kind) {
      const answer = fieldOf(marker);
      if (!isPageField(answer) || !isNextToAdmin() || holdsTheFormOf(answer, kind)) return answer;
      return { notEditable: "form-not-open" };
    },
    fieldOf,
  };
}
