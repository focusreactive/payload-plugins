import type { Crossing, Language, Step, TextLeaf, TextUnit } from "../../contract.js";
import type { EmbedResolver } from "./embed.js";
import type { UnitCut } from "./marks.js";
import { serializeMarks, writeMarks } from "./marks.js";

export type PmNode = {
  type: string;
  text?: string;
  marks?: { type: string }[];
  content?: PmNode[];
  attrs?: { id?: string; body?: Component[] };
};

export type Component = Record<string, unknown> & { component?: string };

type ComponentNode = { type: "__component"; component: Component };

type Node = PmNode | ComponentNode;

export type PmCursor = {
  embed: EmbedResolver;
};

export const PROSEMIRROR_ID = "prosemirror";

const isComponentNode = (node: Node): node is ComponentNode => node.type === "__component";

const textChildren = (node: PmNode): PmNode[] | null => {
  const content = node.content;
  if (content === undefined || content.length === 0) return null;
  return content.every((child) => child.type === "text") ? content : null;
};

const isContainer = (value: unknown): value is PmNode =>
  typeof value === "object" &&
  value !== null &&
  Array.isArray((value as PmNode).content) &&
  (value as PmNode).content?.every((child) => child.type === "text") === true;

function unitsOf(leaf: TextLeaf): TextUnit[] {
  const { value, setValue } = leaf;

  if (typeof value === "string") {
    if (value.trim() === "" || setValue === undefined) return [];
    const write = setValue;
    return [{ text: value, write: (translated) => write(translated) }];
  }

  if (!isContainer(value)) return [];
  const children = value.content ?? [];
  return [
    {
      text: serializeMarks(children),
      write: (translated) => writeMarks(children, translated),
    },
  ];
}

export function prosemirrorLanguage(options?: { cut?: UnitCut }): Language<Node, PmCursor> {
  const cut: UnitCut = options?.cut ?? "per-text-node";

  return {
    id: PROSEMIRROR_ID,

    enter({ context, value }) {
      const { tree, embed } = context as { tree?: PmNode; embed?: EmbedResolver };
      const root = tree ?? (value as PmNode);
      return { nodes: [root], cursor: { embed: embed ?? (() => null) } };
    },

    step(node, cursor): Step<Node, PmCursor> {
      if (isComponentNode(node)) {
        return { kind: "value", value: node.component, segments: [] };
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

      if (node.type === "blok") {
        const body = node.attrs?.body ?? [];
        return {
          kind: "children",
          items: body.map((component, index) => ({
            nodes: [{ type: "__component" as const, component }],
            cursor,
            segments: [node.attrs?.id ?? index],
          })),
        };
      }

      const container = cut === "whole-container" ? textChildren(node) : null;
      if (container !== null) {
        return { kind: "value", value: node, segments: [] };
      }

      if (node.content === undefined) return { kind: "skip" };
      return {
        kind: "children",
        items: node.content.map((child, index) => ({
          nodes: [child],
          cursor,
          segments: [index],
        })),
      };
    },

    selects: () => true,

    isEmpty: (value) => {
      if (typeof value === "string") return value.trim() === "";
      if (isContainer(value)) return serializeMarks(value.content ?? []).trim() === "";
      return value == null;
    },

    textUnits: (leaf: TextLeaf): TextUnit[] => unitsOf(leaf),

    boundary: (node, cursor): Crossing | null =>
      isComponentNode(node) ? cursor.embed(node.component.component, node.component) : null,
  };
}
