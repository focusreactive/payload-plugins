import type { FieldLike, TabLike } from "./types";

function projectField(field: FieldLike): FieldLike {
  const out: FieldLike = { type: field.type };
  if (field.name !== undefined) out.name = field.name;
  if (field.localized !== undefined) out.localized = field.localized;
  if (field.custom !== undefined) out.custom = field.custom;
  if (field.fields) out.fields = field.fields.map(projectField);
  if (field.blocks) {
    out.blocks = field.blocks.map((block) => ({
      slug: block.slug,
      fields: block.fields.map(projectField),
    }));
  }
  if (field.tabs) {
    out.tabs = field.tabs.map((tab) => {
      const projected: TabLike = { fields: tab.fields.map(projectField) };
      if (tab.name !== undefined) projected.name = tab.name;
      if (tab.localized !== undefined) projected.localized = tab.localized;
      return projected;
    });
  }
  return out;
}

/**
 * Deep-project a field schema into an independent {@link FieldLike} tree, copying ONLY the properties
 * this layer reads. Replaces the `JSON.parse(JSON.stringify(fields))` clone the plugin used to snapshot
 * a collection's schema before Payload's sanitizer mutates the originals.
 *
 * Why a bespoke projection rather than a structural clone:
 * - **Independence is mandatory, not cosmetic.** Payload's `sanitizeFields` does `delete field.localized`
 *   **in place** on any field nested under a localized ancestor (group/array/named tab). The pipeline
 *   reads per-field `localized`, so a shared reference would silently lose it and the field would stop
 *   being translated. Every field/container here is a NEW object, and `localized` is copied by value at
 *   projection time (before sanitize runs), so the snapshot is preserved.
 * - **`structuredClone` can't be used.** Field definitions embed Lexical editor configs containing async
 *   functions, which `structuredClone` throws on. The old JSON round-trip "worked" only by silently
 *   dropping every function; this projection drops them explicitly by copying a typed whitelist.
 *
 * The contract is exactly what the traversal/pipeline consumes: `type` (classify), `name`/`localized`
 * (leaf data + translation gate), `custom` (only `custom.translateKit.exclude` is read), and the
 * container members `fields` (group/array/row/collapsible/unnamed-group), `blocks` (with the
 * load-bearing `block.slug` used for block-type dispatch), and `tabs` (named + unnamed). Every field is
 * kept 1:1 (including presentational `ui`/`row`/`collapsible`) so downstream classification is unchanged;
 * only the property set is narrowed.
 *
 * `custom` is copied by reference: it is a passthrough bag Payload does not mutate during sanitize (only
 * `localized` is deleted, which we snapshot by value), and deep-copying it would re-introduce the
 * `structuredClone`-on-functions problem this projection exists to avoid.
 *
 * @param fields - The source field list (Payload's `Field[]` is structurally assignable to `FieldLike[]`).
 * @returns A new, independent `FieldLike[]` unaffected by later mutation of the source objects.
 * @since 0.9.1
 */
export function projectFieldsToFieldLike(fields: FieldLike[]): FieldLike[] {
  return fields.map(projectField);
}
