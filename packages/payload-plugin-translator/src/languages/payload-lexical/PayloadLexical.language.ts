import { elementSegment } from "../../core/domain/content-projection/idPath.js";
import { carriesOwnText, checkSegments } from "../../core/kernel/lexical/checkSegments.js";
import type { InlineFragment } from "../../core/kernel/lexical/collectInlineFragments.js";
import { collectInlineFragments } from "../../core/kernel/lexical/collectInlineFragments.js";
import { foldAnswerIntoContainer } from "../../core/kernel/lexical/foldAnswerIntoContainer.js";
import type { SerializedLexicalNode, SerializedTextNode } from "../../core/kernel/lexical/index.js";
import {
  collectSerializedLexicalTextNodes,
  hasChildren,
  isSerializedLexicalRoot,
  isSerializedLexicalTextNode,
} from "../../core/kernel/lexical/index.js";
import { isObject } from "../../core/kernel/utils/isObject.js";
import type { Crossing, Language, Step, TextLeaf, TextUnit } from "../../traversal/index.js";
import type { ContentCrossing } from "../contentCrossing.js";
import type { EmbedFlow, EmbedIdentity, EmbedResolver } from "../embedCrossing.js";

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
 * What {@link payloadLexicalLanguage}'s `enter` reads: built by {@link payloadLexicalContent} at a crossing, or
 * by the caller at a walk's entry.
 *
 * @public
 */
export type RichTextContext = {
  /**
   * The tree to walk when nothing was crossed in, as at a walk's entry. A context that names it
   * alongside a crossed-in value is refused.
   */
  tree?: unknown;
  embed: EmbedResolver;
};

const isRichTextContext = (value: unknown): value is RichTextContext =>
  isObject(value) && typeof value.embed === "function";

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

export const PAYLOAD_LEXICAL_ID = "payload-lexical";

/** An inline embed is addressed exactly like a standalone one, `id` and `blockType` folded alike. */
const FOLD_BLOCK_TYPE = true;

const flowOf = (type: string): EmbedFlow | null => {
  if (type === "block") return "block";
  if (type === "inlineBlock") return "inline";
  return null;
};

/** Must stay identical to `hasDirectTextChild` in `collectInlineFragments.ts`, which is private there. */
const isContainer = (node: LexicalNode): boolean =>
  hasChildren(node) && node.children.some((child) => isSerializedLexicalTextNode(child));

const embedOf = (node: LexicalNode): EmbedIdentity | null => {
  const flow = flowOf(node.type);
  if (flow === null) return null;

  const { fields } = node;
  if (!isObject(fields) || typeof fields.blockType !== "string") return null;

  return { name: fields.blockType, flow, data: fields };
};

const embedsInside = (node: LexicalNode): LexicalNode[] => {
  if (embedOf(node) !== null) return [node];
  if (!hasChildren(node)) return [];
  return node.children.flatMap((child) => embedsInside(child));
};

/**
 * A container answers "value", so a walk never descends into it and would never see the embeds
 * inside it; they travel beside it instead, at the same address either way (see
 * {@link LexicalCursor.position}).
 *
 * Applied at `enter` too: a root that is itself a container has no parent to lift for it.
 */
const withEmbedsLifted = (nodes: readonly LexicalNode[]): LexicalNode[] =>
  nodes.flatMap((node) => [node, ...(isContainer(node) ? embedsInside(node) : [])]);

const writeText = (node: SerializedTextNode, text: string) => ({
  slot: { holder: node, key: "text" },
  value: text,
});

const cutPerTextNode = (node: LexicalNode): TextUnit[] =>
  collectSerializedLexicalTextNodes(node).map(({ node: textNode }) => ({
    kind: "text",
    text: textNode.text,
    resolve: (translated) => [writeText(textNode, translated)],
  }));

const cutAsOneUnit = (node: LexicalNode, fragments: InlineFragment[]): TextUnit[] => [
  {
    kind: "pieces",
    pieces: fragments.map((fragment) => ({ id: fragment.id, text: fragment.text })),
    resolve: (answered) => {
      // A piece answered `null` that was sent carrying text would fold as an emptied mark:
      // `foldAnswerIntoContainer` drops the run and its formatting.
      const sentWithText = new Set(
        fragments.flatMap((fragment) => (carriesOwnText(fragment.text) ? [fragment.id] : []))
      );
      if (answered.some((piece) => piece.text === null && sentWithText.has(piece.id))) return [];

      const asAnsweredSegments = answered.map((piece) => ({
        id: piece.id,
        text: piece.text ?? "",
      }));
      const checked = checkSegments(asAnsweredSegments, fragments);
      if (!checked.ok) return [];

      const fold = foldAnswerIntoContainer(fragments, checked.segments);
      return [
        ...fold.texts.map(({ node: textNode, text }) => writeText(textNode, text)),
        { slot: { holder: node, key: "children" }, value: fold.replacementChildren },
      ];
    },
  },
];

/**
 * The serialized Lexical tree as a traversal {@link Language}: one unit per container, carrying its
 * runs as pieces so a reply may reorder them; one unit per text node where there is nothing to
 * reorder; a crossing at every embedded node whose content belongs to its host.
 *
 * Emits no address token except at an embed, so every unit of a rich-text field keeps that field's
 * own address — the key the stored provenance receipt uses.
 *
 * @public
 */
export function payloadLexicalLanguage(): Language<LexicalNode, LexicalCursor> {
  return {
    id: PAYLOAD_LEXICAL_ID,

    enter({ context, value }) {
      if (!isRichTextContext(context)) return null;

      const { tree, embed } = context;
      if (tree !== undefined && value !== undefined) return null;

      const root = tree ?? value;
      if (!isSerializedLexicalRoot(root)) return null;

      let seen = 0;
      const position = () => seen++;

      return {
        nodes: withEmbedsLifted([root.root]),
        cursor: { embed, position },
      };
    },

    step(node, cursor): Step<LexicalNode, LexicalCursor> {
      const embed = embedOf(node);
      if (embed !== null) {
        return {
          kind: "value",
          value: embed.data,
          segments: [elementSegment(embed.data, FOLD_BLOCK_TYPE, cursor.position())],
        };
      }

      if (isContainer(node)) {
        return { kind: "value", value: node, segments: [] };
      }

      if (hasChildren(node)) {
        return {
          kind: "children",
          items: withEmbedsLifted(node.children).map((into) => ({
            nodes: [into],
            cursor,
            segments: [],
          })),
        };
      }

      return { kind: "skip" };
    },

    selects: (node) => isContainer(node),

    isEmpty: (value) => collectSerializedLexicalTextNodes(value as LexicalNode).length === 0,

    textUnits: (leaf: TextLeaf): TextUnit[] => {
      const node = leaf.value as LexicalNode;
      const container = collectInlineFragments(node)[0];
      if (container === undefined || container.skip !== undefined) return cutPerTextNode(node);

      return cutAsOneUnit(node, container.fragments);
    },

    boundary(node, cursor): Crossing | null {
      const embed = embedOf(node);
      if (embed === null) return null;
      return cursor.embed(embed);
    },
  };
}

/**
 * @public
 */
export const payloadLexicalContent = (): ContentCrossing => ({
  languageId: PAYLOAD_LEXICAL_ID,

  open: ({ value, embed }) => {
    if (!isSerializedLexicalRoot(value)) return null;
    const context: RichTextContext = { embed };
    return { context, workingCopy: structuredClone(value) };
  },
});
