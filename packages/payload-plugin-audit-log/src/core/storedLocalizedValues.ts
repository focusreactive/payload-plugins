import type { FieldPathPattern } from "../utils/fields";
import { mapAtPaths, valueAt } from "./fieldPaths";

type Doc = Record<string, unknown>;

export function withStoredLocalizedValues(
  doc: Doc,
  stored: Doc | null | undefined,
  localizedFields: readonly FieldPathPattern[],
  locale: string
): Doc {
  if (!stored) return doc;
  return mapAtPaths(doc, [stored], localizedFields, (parent, key, [storedParent]) => {
    if (!(key in parent)) return parent;
    const storedInLocale = valueAt(valueAt(storedParent, key), locale);
    return storedInLocale === parent[key] ? parent : { ...parent, [key]: storedInLocale };
  });
}
