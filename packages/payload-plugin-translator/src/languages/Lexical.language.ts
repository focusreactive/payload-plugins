import { elementSegment, renderSegment } from "../core/domain/content-projection/idPath.js";
import type { SerializedLexicalNode } from "../core/kernel/lexical/index.js";
import {
  hasChildren,
  isSerializedLexicalRoot,
  isSerializedLexicalTextNode,
} from "../core/kernel/lexical/index.js";
import { isEmpty } from "../core/kernel/utils/isEmpty.js";
import { isObject } from "../core/kernel/utils/isObject.js";
import type { Crossing, Language, Step, TextLeaf, TextUnit } from "../core/traversal/index.js";
import type { ContentCrossing } from "./contentCrossing.js";
import type { EmbedKind, EmbedResolver, RichTextContext } from "./richTextCrossing.js";

/**
 * A serialized Lexical node, widened with the two members this language reads.
 *
 * @public
 */
export type LexicalNode = SerializedLexicalNode & {
  children?: SerializedLexicalNode[];
  fields?: unknown;
};

/**
 * What a walk of one tree carries down to every node.
 *
 * @public
 */
export type LexicalCursor = {
  embed: EmbedResolver;
  /**
   * An ordinal per embed, counted over *every* embed in the tree, not only the id-less ones that
   * use it: nothing between the field and the embed reaches the address, so a count that skipped
   * embeds would repeat across parents.
   */
  position: () => number;
};

export const LEXICAL_ID = "lexical";

type Embed = {
  kind: EmbedKind;
  blockType: string;
  data: Record<string, unknown>;
};

const isEmbedKind = (type: string): type is EmbedKind => type === "block" || type === "inlineBlock";

/** An inline embed is addressed exactly like a standalone one, `id` and `blockType` folded alike. */
const FOLD_BLOCK_TYPE = true;

const embedOf = (node: LexicalNode): Embed | null => {
  if (!isEmbedKind(node.type)) return null;

  const { fields } = node;
  if (!isObject(fields) || typeof fields.blockType !== "string") return null;

  return { kind: node.type, blockType: fields.blockType, data: fields };
};

/**
 * The serialized Lexical tree as a traversal {@link Language}: one unit per non-blank text node,
 * a crossing at every embedded node whose content belongs to its host.
 *
 * Emits no address token except at an embed: every unit of one rich-text field keeps that field's
 * own address, which is the key the stored provenance receipt already uses.
 *
 * @public
 */
export function lexicalLanguage(): Language<LexicalNode, LexicalCursor> {
  return {
    id: LEXICAL_ID,

    enter({ context, value }) {
      if (!isObject(context)) return null;

      const { tree, embed } = context;
      // Either precedence loses silently: a stale `tree` keeps the translations nobody saves, a
      // crossed-in value writes them into the locale they were read from.
      if (tree !== undefined && value !== undefined) return null;

      const root = tree ?? value;
      if (!isSerializedLexicalRoot(root) || typeof embed !== "function") return null;

      let seen = 0;
      const position = () => seen++;

      return { nodes: [root.root], cursor: { embed: embed as EmbedResolver, position } };
    },

    step(node, cursor): Step<LexicalNode, LexicalCursor> {
      const embed = embedOf(node);
      if (embed !== null) {
        return {
          kind: "value",
          value: embed.data,
          segments: [renderSegment(elementSegment(embed.data, FOLD_BLOCK_TYPE, cursor.position()))],
        };
      }

      if (isSerializedLexicalTextNode(node)) {
        const textNode = node;
        return {
          kind: "value",
          value: textNode.text,
          segments: [],
          slot: { holder: textNode, key: "text" },
        };
      }

      if (hasChildren(node)) {
        return {
          kind: "children",
          items: node.children.map((child) => ({
            nodes: [child],
            cursor,
            segments: [],
          })),
        };
      }

      return { kind: "skip" };
    },

    selects: (node) => isSerializedLexicalTextNode(node),

    isEmpty,

    textUnits: (leaf: TextLeaf): TextUnit[] => {
      const { value, slot } = leaf;
      if (typeof value !== "string" || slot === undefined) return [];
      return [{ text: value, resolve: (translated) => [{ slot, value: translated }] }];
    },

    boundary(node, cursor): Crossing | null {
      const embed = embedOf(node);
      if (embed === null) return null;
      return cursor.embed(embed.kind, embed.blockType, embed.data);
    },
  };
}

/**
 * @public
 */
export const lexicalContent = (): ContentCrossing => {
  return ({ value, embed }) => {
    if (!isSerializedLexicalRoot(value)) return null;
    const context: RichTextContext = { embed };
    return { languageId: LEXICAL_ID, context, workingCopy: structuredClone(value) };
  };
};
