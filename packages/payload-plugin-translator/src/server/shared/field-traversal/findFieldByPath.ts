import type { Field } from "payload";

import { classifyField, tabScopes } from "./kernel";
import type { LeafField } from "./types";

/**
 * Outcome of navigating a field schema by a path of segment names (see {@link findFieldByPath}).
 *
 * - `leaf` — the path lands on a data-affecting leaf field (carries it).
 * - `container` — the path lands on a `group`/`array`/`blocks` field or a named tab (a container,
 *   not a leaf).
 * - `inside-blocks` — the path descends THROUGH a `blocks` field, which can't be resolved from the
 *   schema alone (the block's `blockType` lives in the data, not the schema).
 * - `not-found` — no field matches a segment, or the path continues past a leaf.
 *
 * @public
 */
export type FieldPathResult = { status: "leaf"; field: LeafField } | { status: "container" } | { status: "inside-blocks" } | { status: "not-found" };

/**
 * Navigate a field schema by a path of segment NAMES, descending one matching branch at a time
 * with early-exit (targeted navigation, not an exhaustive walk). Presentational containers
 * (`row`/`collapsible`/unnamed `group`) and unnamed tabs are transparent — searched in the same
 * path scope. Built on {@link classifyField} / {@link tabScopes} so the structural dispatch lives
 * in one place.
 *
 * The caller supplies already-prepared name segments (split, trimmed, with array indices dropped —
 * a field's config is shared across array items, so indices never appear in the schema).
 *
 * @param fields - The schema level to search.
 * @param segments - Remaining path segments (names) to match, head-first.
 * @returns A {@link FieldPathResult}.
 * @public
 */
export function findFieldByPath(fields: Field[], segments: string[]): FieldPathResult {
  const [head, ...rest] = segments;
  if (head === undefined) return { status: "not-found" };

  for (const field of fields) {
    const structure = classifyField(field);

    switch (structure.kind) {
      case "tabs": {
        for (const scope of tabScopes(structure.field)) {
          if (scope.named) {
            if (scope.tab.name === head) {
              return rest.length === 0 ? { status: "container" } : findFieldByPath(scope.tab.fields, rest);
            }
          } else {
            const found = findFieldByPath(scope.fields, segments); // unnamed tab → same path scope
            if (found.status !== "not-found") return found;
          }
        }
        break;
      }
      case "transparent": {
        const found = findFieldByPath(structure.fields, segments); // row/collapsible/unnamed group → same scope
        if (found.status !== "not-found") return found;
        break;
      }
      case "presentational":
        break;
      case "group":
      case "array": {
        if (structure.name !== head) break;
        return rest.length === 0 ? { status: "container" } : findFieldByPath(structure.fields, rest);
      }
      case "blocks": {
        if (structure.name !== head) break;
        return rest.length === 0 ? { status: "container" } : { status: "inside-blocks" };
      }
      case "leaf": {
        if (structure.name !== head) break;
        return rest.length === 0 ? { status: "leaf", field: structure.field } : { status: "not-found" };
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
