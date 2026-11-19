import type { Block, Field, UploadField } from "payload";

/** Editor-facing text in both admin languages. */
export interface Bilingual extends Record<string, string> {
  en: string;
  es: string;
}

/**
 * Gives a field built by a shared helper, which takes English text only, its label and
 * description in both admin languages.
 */
export function bilingual<TField extends Field>(
  field: TField,
  label: Bilingual,
  description: Bilingual
): TField {
  const admin = "admin" in field ? field.admin : undefined;

  return { ...field, admin: { ...admin, description }, label } as TField;
}

/** The section's name in the add-section menu, in both admin languages. */
export function bilingualBlock(block: Block, label: Bilingual): Block {
  return { ...block, labels: { plural: label, singular: label } };
}

export function mediaField(name: string, label: Bilingual, description: Bilingual): UploadField {
  return {
    admin: { description },
    label,
    name,
    relationTo: "media",
    type: "upload",
  };
}
