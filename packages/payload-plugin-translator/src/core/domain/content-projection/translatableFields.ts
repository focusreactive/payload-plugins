import type { FieldLike } from "../../kernel/field-traversal/types.js";
import type { LanguageTable } from "../../../traversal/index.js";
import { projectTranslatableContent } from "./contentProjector.js";
import { foldTranslatableContent } from "./foldTranslatableContent.js";
import type { CrossedPiece, FoldedField } from "./foldTranslatableContent.js";
import type { IdPath } from "./idPath.js";

export type FieldContent = {
  address: IdPath;
  ownText: string;
  crossedIn: readonly CrossedPiece[];
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
      ownText: entry.text,
      crossedIn: found?.crossedIn ?? [],
    });
  }

  for (const field of foundOnlyByTheWalk.values()) {
    ordered.push({ address: field.address, ownText: "", crossedIn: field.crossedIn });
  }

  return ordered;
}
