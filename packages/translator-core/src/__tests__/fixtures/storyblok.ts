import type { Crossing, Language, Step, TextLeaf, TextUnit } from "../../contract.js";

export type FieldDef = {
  type: string;
  translatable?: boolean;
  richTextLanguage?: string;
  allowedEmbeds?: string[];
};

export type ComponentSchema = Record<string, FieldDef>;
export type ComponentRegistry = Record<string, ComponentSchema>;

export type Blok = Record<string, unknown> & { _uid?: string; component?: string };

type Node = { name: string; def: FieldDef };

export type BlokCursor = {
  source: Blok;
  target: Blok;
  registry: ComponentRegistry;
};

const TRANSLATABLE = new Set(["text", "textarea"]);

export const STORYBLOK_ID = "storyblok";

const asBlok = (value: unknown): Blok | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Blok) : null;

const fieldsOf = (registry: ComponentRegistry, blok: Blok): Node[] => {
  const schema = registry[blok.component ?? ""];
  if (schema === undefined) return [];
  return Object.entries(schema).map(([name, def]) => ({ name, def }));
};

export function storyblokLanguage(): Language<Node, BlokCursor> {
  return {
    id: STORYBLOK_ID,

    enter({ context }) {
      const { registry, source, target } = context as {
        registry: ComponentRegistry;
        source: Blok;
        target: Blok;
      };
      return { nodes: fieldsOf(registry, source), cursor: { source, target, registry } };
    },

    step(node, cursor): Step<Node, BlokCursor> {
      const { name, def } = node;

      if (def.type === "bloks") {
        const targets = Array.isArray(cursor.target[name]) ? (cursor.target[name] as Blok[]) : [];
        const sources = Array.isArray(cursor.source[name]) ? (cursor.source[name] as Blok[]) : [];
        const items = sources.flatMap((element, index) => {
          const paired = targets.find((candidate) => candidate._uid === element._uid);
          if (paired === undefined) return [];
          return [
            {
              nodes: fieldsOf(cursor.registry, element),
              cursor: { source: element, target: paired, registry: cursor.registry },
              segments: [name, element._uid ?? index],
            },
          ];
        });
        return { kind: "children", items };
      }

      return {
        kind: "value",
        value: cursor.source[name],
        segments: [name],
        setValue: (value) => {
          cursor.target[name] = value;
        },
      };
    },

    selects: (node) => TRANSLATABLE.has(node.def.type) && node.def.translatable === true,

    isEmpty: (value) => (typeof value === "string" ? value.trim() === "" : value == null),

    textUnits: (leaf: TextLeaf): TextUnit[] => {
      const { value, setValue } = leaf;
      if (typeof value !== "string" || value.trim() === "" || setValue === undefined) return [];
      const write = setValue;
      return [{ text: value, write: (translated) => write(translated) }];
    },

    boundary(node, cursor): Crossing | null {
      const { name, def } = node;
      if (def.type !== "richtext" || def.translatable !== true) return null;
      const tree = cursor.target[name];
      if (tree === undefined || tree === null) return null;

      const allowed = new Set(def.allowedEmbeds);
      const { registry } = cursor;
      if (def.richTextLanguage === undefined) return null;
      return {
        languageId: def.richTextLanguage,
        context: {
          tree,
          embed: (embedName: string, data: unknown): Crossing | null => {
            const blok = asBlok(data);
            if (blok === null || !allowed.has(embedName)) return null;
            return {
              languageId: STORYBLOK_ID,
              context: { registry, source: blok, target: blok },
            };
          },
        },
      };
    },
  };
}
