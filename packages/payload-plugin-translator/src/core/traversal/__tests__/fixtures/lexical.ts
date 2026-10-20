import type { Crossing, Language, Step, TextLeaf, TextUnit } from "../../contract.js";
import type { EmbedResolver } from "./embed.js";
import type { UnitCut } from "./marks.js";
import { serializeMarks, writeMarks } from "./marks.js";

export type LexNode = {
  type: string;
  text?: string;
  format?: number;
  children?: LexNode[];
  fields?: Record<string, unknown> & { blockType?: string };
};

export type LexRoot = { root: LexNode };

export type LexCursor = { embed: EmbedResolver };

export const LEXICAL_ID = "lexical";

const EMBED_TYPES = new Set(["block", "inlineBlock"]);

const textChildren = (node: LexNode): LexNode[] | null => {
  const children = node.children;
  if (children === undefined || children.length === 0) return null;
  return children.every((child) => child.type === "text") ? children : null;
};

const isContainer = (value: unknown): value is LexNode =>
  typeof value === "object" &&
  value !== null &&
  Array.isArray((value as LexNode).children) &&
  (value as LexNode).children?.every((child) => child.type === "text") === true;

function unitsOf(leaf: TextLeaf): TextUnit[] {
  const { value, setValue } = leaf;

  if (typeof value === "string") {
    if (value.trim() === "" || setValue === undefined) return [];
    const write = setValue;
    return [{ text: value, write: (translated) => write(translated) }];
  }

  if (!isContainer(value)) return [];
  const children = value.children ?? [];
  return [
    {
      text: serializeMarks(children),
      write: (translated) => writeMarks(children, translated),
    },
  ];
}

export function lexicalLanguage(options?: { cut?: UnitCut }): Language<LexNode, LexCursor> {
  const cut: UnitCut = options?.cut ?? "per-text-node";

  return {
    id: LEXICAL_ID,

    enter({ context, value }) {
      const { tree, embed } = context as { tree?: LexRoot; embed?: EmbedResolver };
      const root = tree ?? (value as LexRoot);
      return { nodes: [root.root], cursor: { embed: embed ?? (() => null) } };
    },

    step(node, cursor): Step<LexNode, LexCursor> {
      if (EMBED_TYPES.has(node.type)) {
        return { kind: "value", value: node.fields, segments: [] };
      }

      if (node.type === "text") {
        return {
          kind: "value",
          value: node.text,
          segments: [],
          setValue: (value) => {
            if (typeof value === "string") node.text = value;
          },
        };
      }

      if (cut === "whole-container" && textChildren(node) !== null) {
        return { kind: "value", value: node, segments: [] };
      }

      if (node.children === undefined) return { kind: "skip" };
      return {
        kind: "children",
        items: node.children.map((child, index) => ({
          nodes: [child],
          cursor,
          segments: [index],
        })),
      };
    },

    selects: () => true,

    isEmpty: (value) => {
      if (typeof value === "string") return value.trim() === "";
      if (isContainer(value)) return serializeMarks(value.children ?? []).trim() === "";
      return value == null;
    },

    textUnits: (leaf: TextLeaf): TextUnit[] => unitsOf(leaf),

    boundary: (node, cursor): Crossing | null =>
      EMBED_TYPES.has(node.type) && node.fields !== undefined
        ? cursor.embed(node.fields.blockType, node.fields)
        : null,
  };
}
