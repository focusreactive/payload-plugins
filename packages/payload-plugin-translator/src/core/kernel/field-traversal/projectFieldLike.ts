import type { BlockLike, BlockSlug, FieldLike, TabLike } from "./types.js";

class FieldProjection {
  private readonly definitions: Map<BlockSlug, BlockLike>;
  private readonly projectedShared = new Map<BlockSlug, BlockLike>();

  constructor(sharedBlocks: readonly BlockLike[]) {
    this.definitions = new Map(sharedBlocks.map((block) => [block.slug, block]));
  }

  private field(field: FieldLike): FieldLike {
    const out: FieldLike = { type: field.type };
    if (field.name !== undefined) out.name = field.name;
    if (field.localized !== undefined) out.localized = field.localized;
    if (field.custom !== undefined) out.custom = field.custom;
    if (field.fields) out.fields = this.fields(field.fields);
    const blocks = field.blockReferences ?? field.blocks;
    if (blocks) out.blocks = blocks.flatMap((block) => this.block(block) ?? []);
    if (field.tabs) {
      out.tabs = field.tabs.map((tab) => {
        const projected: TabLike = { fields: this.fields(tab.fields) };
        if (tab.name !== undefined) projected.name = tab.name;
        if (tab.localized !== undefined) projected.localized = tab.localized;
        return projected;
      });
    }
    return out;
  }

  fields(fields: FieldLike[]): FieldLike[] {
    return fields.map((field) => this.field(field));
  }

  private block(block: BlockLike | BlockSlug): BlockLike | undefined {
    if (typeof block === "string") return this.sharedBlock(block);
    return { slug: block.slug, fields: this.fields(block.fields) };
  }

  private sharedBlock(slug: BlockSlug): BlockLike | undefined {
    const cached = this.projectedShared.get(slug);
    if (cached) return cached;

    const definition = this.definitions.get(slug);
    if (!definition) return undefined;

    const projected: BlockLike = { slug, fields: [] };
    this.projectedShared.set(slug, projected);
    projected.fields = this.fields(definition.fields);
    return projected;
  }
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
 * A `blockReferences` field comes out as a plain `blocks` list (Payload's `blockReferences ?? blocks`); a
 * slug resolves against `sharedBlocks` and is dropped when nothing defines it. A shared block is projected
 * once and reused, so the result may be cyclic: consumers must walk it by data, never by schema alone.
 *
 * `custom` is copied by reference: it is a passthrough bag Payload does not mutate during sanitize (only
 * `localized` is deleted, which we snapshot by value), and deep-copying it would re-introduce the
 * `structuredClone`-on-functions problem this projection exists to avoid.
 *
 * @param fields - The source field list (Payload's `Field[]` is structurally assignable to `FieldLike[]`).
 * @param sharedBlocks - The config-level blocks (`config.blocks`) a `blockReferences` slug points into.
 * @returns A new, independent `FieldLike[]` unaffected by later mutation of the source objects.
 * @since 0.9.1
 */
export function projectFieldsToFieldLike(
  fields: FieldLike[],
  sharedBlocks: readonly BlockLike[] = []
): FieldLike[] {
  return new FieldProjection(sharedBlocks).fields(fields);
}
