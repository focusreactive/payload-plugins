/**
 * Locally-owned structural views of the serialized Lexical JSON stored in Payload richText
 * fields. Defined here (rather than imported from `@payloadcms/richtext-lexical`) so this layer
 * stays framework-agnostic for the `@repo/translator-core` extraction. They are intentionally a
 * structural SUPERSET of what this package reads (`type`, `text`, `children`) — Payload's concrete
 * `Serialized*` nodes remain assignable to them (guarded by `types.conformance.test.ts`).
 */

/** Base serialized Lexical node. `version` is carried by real nodes but never read here. */
export type SerializedLexicalNode = {
  type: string;
  version?: number;
};

/** A serialized text node — the only node whose `text` this package translates (and mutates). */
export type SerializedTextNode = SerializedLexicalNode & {
  text: string;
};

/** An element node that carries children (e.g. the editor root, paragraphs). */
export type SerializedRootNode = SerializedLexicalNode & {
  children: SerializedLexicalNode[];
};

/**
 * Serialized Lexical root structure as stored in Payload CMS richText fields.
 * Wraps the root node in a { root: ... } object.
 */
export type SerializedLexicalRoot = {
  root: SerializedLexicalNode;
};

/**
 * Reference to a serialized text node for mutation during translation.
 */
export type SerializedTextNodeRef = {
  node: SerializedTextNode;
};
