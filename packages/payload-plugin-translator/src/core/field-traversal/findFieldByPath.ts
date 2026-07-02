import { classifyField, resolveBlockFields, tabScopes } from "./kernel";
import type { FieldLike, LeafField } from "./types";

/**
 * Outcome of navigating a field schema by a path of segment names (see {@link findFieldByPath}).
 *
 * - `leaf` — the path lands on a data-affecting leaf field (carries it).
 * - `container` — the path lands on a `group`/`array`/`blocks` field, a single block element, or a
 *   named tab (a container, not a leaf).
 * - `inside-blocks` — the path descends THROUGH a `blocks` field that can't be resolved: no
 *   document data was supplied (so the element's `blockType` is unknown), the data is missing at
 *   that index, or the `blockType` matches no defined block.
 * - `localized-list-ancestor` — the path descends THROUGH a `localized` `blocks`/`array` field.
 *   Such fields are stored independently per locale (different order/content), so an element index
 *   is not a stable cross-locale identity; a caller translating *by path across locales* should
 *   refuse rather than resolve positionally. (See the "cross-locale block identity" design.)
 * - `not-found` — no field matches a segment, or the path continues past a leaf.
 *
 * @public
 */
export type FieldPathResult =
  | { status: "leaf"; field: LeafField }
  | { status: "container" }
  | { status: "inside-blocks" }
  | { status: "localized-list-ancestor" }
  | { status: "not-found" };

const isIndexSegment = (segment: string): boolean => /^\d+$/u.test(segment);

/** Safely read `key` off an object/array; `undefined` for non-objects (arrays index by string key). */
const childData = (data: unknown, key: string): unknown =>
  data != null && typeof data === "object" ? (data as Record<string, unknown>)[key] : undefined;

/**
 * Navigate a field schema by a path of segment NAMES, descending one matching branch at a time
 * with early-exit (targeted navigation, not an exhaustive walk). Presentational containers
 * (`row`/`collapsible`/unnamed `group`) and unnamed tabs are transparent — searched in the same
 * path scope. Built on {@link classifyField} / {@link tabScopes} / {@link resolveBlockFields} so
 * the structural dispatch lives in one place.
 *
 * **Array indices and `blocks`.** Array element configs are shared, so a numeric segment after an
 * array name selects the data item but not the schema (the schema continues into `array.fields`).
 * A `blocks` field is polymorphic — which block (and thus which fields) sits at an index lives in
 * the *data*, not the schema. So to descend through `blocks` the caller must pass the document
 * `data` and keep the element index in the path: this function reads `data[name][index].blockType`
 * and resolves the matching block via {@link resolveBlockFields}. Without `data` (or with a
 * non-indexed path), descending through `blocks` returns `inside-blocks`.
 *
 * @param fields - The schema level to search.
 * @param segments - Remaining path segments to match, head-first. Keep array/block element indices
 *   in the path when navigating with `data`.
 * @param data - The document (sub)tree aligned with `fields`, used only to disambiguate `blocks`.
 *   Omit for schema-only navigation.
 * @returns A {@link FieldPathResult}.
 * @public
 */
export function findFieldByPath(
  fields: FieldLike[],
  segments: string[],
  data?: unknown
): FieldPathResult {
  const [head, ...rest] = segments;
  if (head === undefined) return { status: "not-found" };

  for (const field of fields) {
    const structure = classifyField(field);

    switch (structure.kind) {
      case "tabs": {
        for (const scope of tabScopes(structure.field)) {
          if (scope.named) {
            if (scope.tab.name === head) {
              return rest.length === 0
                ? { status: "container" }
                : findFieldByPath(scope.tab.fields, rest, childData(data, head));
            }
          } else {
            const found = findFieldByPath(scope.fields, segments, data); // unnamed tab → same path + data scope
            if (found.status !== "not-found") return found;
          }
        }
        break;
      }
      case "transparent": {
        const found = findFieldByPath(structure.fields, segments, data); // row/collapsible/unnamed group → same scope
        if (found.status !== "not-found") return found;
        break;
      }
      case "presentational":
        break;
      case "group": {
        if (structure.name !== head) break;
        return rest.length === 0
          ? { status: "container" }
          : findFieldByPath(structure.fields, rest, childData(data, head));
      }
      case "array": {
        if (structure.name !== head) break;
        if (rest.length === 0) return { status: "container" };
        // A localized array is an independent per-locale structure — its element index is not a
        // stable identity across locales, so refuse to navigate THROUGH it by path.
        if (structure.field.localized) return { status: "localized-list-ancestor" };
        // A numeric segment selects the data element; the schema is shared across elements.
        const [next, ...tail] = rest;
        if (isIndexSegment(next)) {
          return tail.length === 0
            ? { status: "container" }
            : findFieldByPath(structure.fields, tail, childData(childData(data, head), next));
        }
        return findFieldByPath(structure.fields, rest, childData(data, head));
      }
      case "blocks": {
        if (structure.name !== head) break;
        if (rest.length === 0) return { status: "container" };
        // A localized blocks field is an independent per-locale structure — its element index is
        // not a stable identity across locales, so refuse to navigate THROUGH it by path.
        if (structure.field.localized) return { status: "localized-list-ancestor" };
        // Polymorphic: need the element index + its data to pick the block schema by `blockType`.
        const [next, ...tail] = rest;
        if (!isIndexSegment(next)) return { status: "inside-blocks" };
        const item = childData(childData(data, head), next);
        const blockFields = resolveBlockFields(structure.field, item);
        if (!blockFields) return { status: "inside-blocks" };
        return tail.length === 0
          ? { status: "container" }
          : findFieldByPath(blockFields, tail, item);
      }
      case "leaf": {
        if (structure.name !== head) break;
        return rest.length === 0
          ? { status: "leaf", field: structure.field }
          : { status: "not-found" };
      }
      default: {
        // Exhaustiveness guard: a new FieldStructure kind would error here at compile time.
        const exhaustive: never = structure;
        throw new Error(`unhandled field structure: ${String(exhaustive)}`);
      }
    }
  }

  return { status: "not-found" };
}
