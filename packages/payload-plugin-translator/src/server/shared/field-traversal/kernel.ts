import type { BlocksField, Field, TabsField } from "payload";
import { fieldAffectsData, fieldIsArrayType, fieldIsBlockType, fieldIsGroupType, tabHasName } from "payload/shared";

import { hasFields, isBlockItem, isTabsField } from "../guards";
import { isObject } from "../utils";
import type { FieldStructure, LeafField, TabScope } from "./types";

/**
 * Classify a single Payload {@link Field} into a discriminated {@link FieldStructure} — the
 * one place that encodes how Payload field types map onto data boundaries.
 *
 * Traversals switch on the result instead of re-deriving the predicate chain
 * (`fieldAffectsData` / `fieldIsGroupType` / …), so the dispatch — and any future Payload
 * field type — lives in exactly one place.
 *
 * @param field - Any field from a collection/global `fields` array (original, un-sanitized
 * config).
 * @returns The field's {@link FieldStructure}:
 * - `tabs` — a `tabs` field (expand with {@link tabScopes}).
 * - `transparent` — a presentational container that opens **no** data boundary (`row`,
 *   `collapsible`, unnamed `group`); its `fields` live in the parent's data scope.
 * - `presentational` — a `ui` field: no data, no subfields.
 * - `group` / `array` / `blocks` — named data boundaries (carry `name` + child `fields`,
 *   except `blocks` whose child fields are per-element via {@link resolveBlockFields}).
 * - `leaf` — a data-affecting field with no subfields.
 *
 * Dispatch order is significant: some fields satisfy more than one predicate and only the
 * order disambiguates them.
 * - `tabs` is checked first — it carries `.tabs` (not `.fields`) and is non-data-affecting,
 *   so a later check would mislabel it `presentational`.
 * - `fieldAffectsData` is resolved before the `group` check, so an unnamed group resolves to
 *   `transparent`, never a `group` with `name: undefined`.
 *
 * @example
 * ```ts
 * const structure = classifyField(field);
 * switch (structure.kind) {
 *   case "group": descend(structure.fields, data[structure.name]); break;
 *   case "leaf":  translate(structure.field, structure.name); break;
 *   // ...handle the remaining kinds
 * }
 * ```
 *
 * @see {@link walkFields} — the recursive engine built on this classification.
 * @public
 */
export function classifyField(field: Field): FieldStructure {
  if (isTabsField(field)) {
    return { kind: "tabs", field };
  }

  if (!fieldAffectsData(field)) {
    return hasFields(field) ? { kind: "transparent", fields: field.fields } : { kind: "presentational" };
  }

  if (fieldIsGroupType(field)) {
    return { kind: "group", name: field.name, fields: field.fields, field };
  }

  if (fieldIsArrayType(field)) {
    return { kind: "array", name: field.name, fields: field.fields, field };
  }

  if (fieldIsBlockType(field)) {
    return { kind: "blocks", name: field.name, field };
  }

  const leaf = field as LeafField;
  return { kind: "leaf", name: leaf.name, field: leaf };
}

/**
 * Flatten a `tabs` field's tabs into {@link TabScope}s, absorbing the named/unnamed +
 * `hasFields` handling that field traversals would otherwise each repeat.
 *
 * @param field - A Payload `tabs` field.
 * @returns One {@link TabScope} per tab that has fields, in declaration order:
 * - a **named** tab → `{ named: true, tab }` — it opens a data boundary at `tab.name`, and
 *   the `NamedTab` is surfaced so callers can read its `name`/`fields`/config;
 * - an **unnamed** tab → `{ named: false, fields }` — its fields live in the parent's data
 *   scope, so only the `fields` are needed.
 *
 * @example
 * ```ts
 * for (const scope of tabScopes(tabsField)) {
 *   if (scope.named) descendInto(data[scope.tab.name], scope.tab.fields);
 *   else descendInto(data, scope.fields); // unnamed tab — same data scope as the parent
 * }
 * ```
 * @public
 */
export function tabScopes(field: TabsField): TabScope[] {
  const scopes: TabScope[] = [];
  for (const tab of field.tabs) {
    if (tabHasName(tab)) scopes.push({ named: true, tab });
    else if (hasFields(tab)) scopes.push({ named: false, fields: tab.fields });
  }
  return scopes;
}

/**
 * Resolve the child `fields` for a single `blocks` element by matching its `blockType`
 * against the field's block definitions.
 *
 * @param field - A Payload `blocks` field carrying inline block definitions.
 * @param item - The data for one block element (expected to carry a `blockType` string).
 * @returns The matched block's `fields`, or `null` when `item` is not a block object or its
 * `blockType` matches no defined block.
 *
 * Assumes the **original, un-sanitized** schema, where blocks are inline `Block` objects on
 * `field.blocks`. Payload's sanitized config may instead carry `blockReferences` resolved
 * against the top-level config — not handled here by design, since this package traverses
 * the original schema to preserve nested `localized` flags.
 *
 * @example
 * ```ts
 * const fields = resolveBlockFields(blocksField, item);
 * if (fields) descendInto(item, fields); // null → unknown blockType / not a block → skip
 * ```
 * @public
 */
export function resolveBlockFields(field: BlocksField, item: unknown): Field[] | null {
  if (!isBlockItem(item)) return null;
  const block = field.blocks.find((candidate) => candidate.slug === item.blockType);
  return block ? block.fields : null;
}

/**
 * Find the element of a parallel data array that corresponds to `refItem` by `id` — not by
 * position.
 *
 * Localized `blocks`/`array` fields are stored independently per locale, so the locales can be
 * reordered or differ entirely; pairing two parallel trees by position then cross-contaminates
 * unrelated elements ("blocks don't line up across locales"). Matching by `id` is correct in both
 * regimes: a non-localized field is one shared row with the same `id` across locales (so id-match
 * equals the old positional match), while independent localized content has diverging ids (no
 * match → the caller falls back to `refItem`'s own values, never another element's). For blocks the
 * `blockType` must also match, so an id collision across types can't graft mismatched fields.
 *
 * Shared by the translation pipeline's two multi-tree walkers — reconcile and collect — to pair
 * their `target` array against the source/reference element currently being visited.
 *
 * @param arr - The array to search (e.g. the target-locale elements).
 * @param refItem - The element being matched, carrying the canonical `id` (and `blockType`).
 * @param isBlocks - Whether the field is a `blocks` field (then `blockType` must also match).
 * @returns The matched element, or `{}` when there is no counterpart (or `refItem` carries no `id`).
 * @public
 */
export function matchElementById(arr: unknown[], refItem: Record<string, unknown>, isBlocks: boolean): Record<string, unknown> {
  const id = refItem.id;
  if (id === undefined || id === null) return {};
  const match = arr.find((candidate) => isObject(candidate) && candidate.id === id && (!isBlocks || candidate.blockType === refItem.blockType));
  return isObject(match) ? match : {};
}
