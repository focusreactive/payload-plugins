import { TranslatorBug } from "../../errors/index.js";
import { classifyField, tabScopes } from "./kernel.js";
import type { BlockLike, FieldLike, TabLike } from "./types.js";

export const ARRAY_ELEMENT = "#item";

export const blockElement = (slug: string): string => `#${slug}`;

export const isElementToken = (token: string): boolean => token.startsWith("#");

export const elementName = (token: string): string =>
  isElementToken(token) ? token.slice(1) : token;

export const dataPath = (path: SchemaPath): string[] =>
  path.filter((token) => !isElementToken(token));

/**
 * Generic over the caller's own field type, so a richer field survives the walk instead of being
 * flattened to {@link FieldLike}.
 */
export type SchemaField<F> = FieldLike & {
  fields?: F[];
  tabs?: (TabLike & { fields: F[] })[];
  blocks?: (BlockLike & { fields: F[] })[];
};

type TabOf<F extends SchemaField<F>> = NonNullable<F["tabs"]>[number];
type BlockOf<F extends SchemaField<F>> = NonNullable<F["blocks"]>[number];

/**
 * The field names down to a node, with an element token for every list crossed.
 */
export type SchemaPath = readonly string[];

/**
 * One position in a schema. A list is visited once, and then once per shape its elements may take:
 * a single shape for an array, one per block for a blocks list.
 */
export type SchemaNode<F extends SchemaField<F>> =
  | { kind: "group"; field: F; name: string; path: SchemaPath }
  | { kind: "tab"; tab: TabOf<F> & { name: string }; name: string; path: SchemaPath }
  | { kind: "list"; field: F; name: string; path: SchemaPath }
  /** What to call this position: the block's slug where there is one, else the list's own name. */
  | { kind: "element"; field: F; block: BlockOf<F> | null; name: string; path: SchemaPath }
  | { kind: "leaf"; field: F; name: string; path: SchemaPath };

export type SchemaWalk<F extends SchemaField<F>> = {
  /**
   * A sanitized config keeps block slugs rather than the definitions, so the caller answers which
   * blocks a list offers ({@link inlineBlocks} where the snapshot carries them inline).
   */
  blocksOf: (field: F) => readonly BlockOf<F>[];
  visit: (node: SchemaNode<F>) => void;
};

export const inlineBlocks = <F extends SchemaField<F>>(field: F): readonly BlockOf<F>[] =>
  field.blocks ?? [];

class SchemaSweep<F extends SchemaField<F>> {
  private readonly walk: SchemaWalk<F>;
  /**
   * A shared block may hold itself, and the schema projection renders that as a real cycle. Keyed
   * by the definition rather than its slug: a block nested under another that happens to reuse the
   * slug is a different shape, and skipping it would lose every field it declares.
   */
  private readonly insideBlocks = new Set<unknown>();

  constructor(walk: SchemaWalk<F>) {
    this.walk = walk;
  }

  level(fields: readonly F[], path: SchemaPath): void {
    for (const field of fields) {
      const structure = classifyField(field);
      switch (structure.kind) {
        case "presentational":
          break;
        case "transparent":
          this.level(field.fields ?? [], path);
          break;
        case "tabs":
          this.tabs(field, path);
          break;
        case "group": {
          const at = [...path, structure.name];
          this.walk.visit({ kind: "group", field, name: structure.name, path: at });
          this.level(field.fields ?? [], at);
          break;
        }
        case "array":
          this.array(field, structure.name, path);
          break;
        case "blocks":
          this.blocks(field, structure.name, path);
          break;
        case "leaf":
          this.walk.visit({
            kind: "leaf",
            field,
            name: structure.name,
            path: [...path, structure.name],
          });
          break;
        default: {
          const exhaustive: never = structure;
          throw new TranslatorBug(`unhandled field structure: ${String(exhaustive)}`);
        }
      }
    }
  }

  private tabs(field: F, path: SchemaPath): void {
    for (const scope of tabScopes({ tabs: field.tabs ?? [] })) {
      if (!scope.named) {
        this.level(scope.fields, path);
        continue;
      }
      const at = [...path, scope.tab.name];
      this.walk.visit({ kind: "tab", tab: scope.tab, name: scope.tab.name, path: at });
      this.level(scope.tab.fields, at);
    }
  }

  private array(field: F, name: string, path: SchemaPath): void {
    const at = [...path, name];
    this.walk.visit({ kind: "list", field, name, path: at });
    const element = [...at, ARRAY_ELEMENT];
    this.walk.visit({ kind: "element", field, block: null, name, path: element });
    this.level(field.fields ?? [], element);
  }

  private blocks(field: F, name: string, path: SchemaPath): void {
    const at = [...path, name];
    this.walk.visit({ kind: "list", field, name, path: at });
    for (const block of this.walk.blocksOf(field)) {
      if (this.insideBlocks.has(block)) continue;
      this.insideBlocks.add(block);
      const element = [...at, blockElement(block.slug)];
      this.walk.visit({ kind: "element", field, block, name: block.slug, path: element });
      this.level(block.fields, element);
      this.insideBlocks.delete(block);
    }
  }
}

/**
 * Depth-first walk of a field schema without a document; the caller says which blocks a list
 * offers.
 *
 * A block already open on this branch is not visited again: the schema projection is cyclic on
 * purpose, so a path missing under a block of the same slug is the shape the caller is already
 * inside.
 *
 * The per-kind dispatch is not shared with the data fold on purpose: reading the children off the
 * caller's own field is what keeps a richer field type from being flattened.
 */
export function walkSchema<F extends SchemaField<F>>(
  fields: readonly F[],
  walk: SchemaWalk<F>
): void {
  new SchemaSweep(walk).level(fields, []);
}
