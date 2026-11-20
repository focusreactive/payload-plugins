import { isFieldExcludedFromTranslation } from "../../../core/domain/field-config/index.js";
import {
  isLocalizedFieldLike,
  isTranslatableFieldType,
} from "../../../core/domain/content-projection/translatableLeaf.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";

import type { CollectionPresentation } from "./collectionPresentation.js";
import { schemaLeaves } from "../_lib/schemaLeaves.js";

const optedOut = (field: FieldLike): boolean =>
  isTranslatableFieldType(field) &&
  isLocalizedFieldLike(field) &&
  isFieldExcludedFromTranslation(field);

export function excludedLabels(
  schema: readonly FieldLike[],
  presentation: CollectionPresentation
): string[] {
  return schemaLeaves(schema)
    .filter((leaf) => optedOut(leaf.field))
    .flatMap((leaf) => {
      const label = presentation.at(leaf.path)?.label;
      return label === undefined ? [] : [label];
    });
}
