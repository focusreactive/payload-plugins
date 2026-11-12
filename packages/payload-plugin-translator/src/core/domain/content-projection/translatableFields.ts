/**
 * A field's hashed text is a sum: what {@link projectTranslatableContent} produces for the field,
 * plus whatever the walk found below a crossing at the same address. One answer for what a run
 * hashes and what it may select, so the two cannot drift.
 */

import type { FieldLike } from "../../kernel/field-traversal/types.js";
import type { LanguageTable } from "../../traversal/index.js";
import { projectTranslatableContent } from "./contentProjector.js";
import { foldTranslatableContent } from "./foldTranslatableContent.js";
import type { FoldedField } from "./foldTranslatableContent.js";
import type { IdPath } from "./idPath.js";

export type FieldContent = {
  address: IdPath;
  text: string;
};

export function translatableFields(
  doc: Record<string, unknown>,
  schema: FieldLike[],
  walk: LanguageTable
): readonly FieldContent[] {
  const folded = foldTranslatableContent({
    languages: walk.languages,
    entry: {
      languageId: walk.hostLanguageId,
      context: { fields: schema, data: doc, source: doc },
    },
  });
  const foundOnlyByTheWalk = new Map<IdPath, FoldedField>(
    folded.map((field) => [field.address, field])
  );
  const ordered: FieldContent[] = [];

  for (const entry of projectTranslatableContent(doc, schema)) {
    const found = foundOnlyByTheWalk.get(entry.idPath);
    foundOnlyByTheWalk.delete(entry.idPath);
    ordered.push({
      address: entry.idPath,
      text: `${entry.text}${found?.crossedInText ?? ""}`,
    });
  }

  for (const field of foundOnlyByTheWalk.values()) {
    ordered.push({ address: field.address, text: field.crossedInText });
  }

  return ordered;
}
