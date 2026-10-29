import type { Crossing, Language, Step, TextLeaf, TextUnit } from "../../contract.js";

export type BlockLike = { slug: string; fields: FieldLike[] };

export type FieldLike = {
  type: string;
  name?: string;
  localized?: boolean;
  excluded?: boolean;
  fields?: FieldLike[];
  blocks?: BlockLike[];
  embeds?: BlockLike[];
  richTextLanguage?: string;
};

export type Doc = Record<string, unknown>;

export type SchemaCursor = { source: Doc; target: Doc };

type Element = Doc & { id?: string | number; blockType?: string };

const asDoc = (value: unknown): Doc | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Doc) : null;

const asList = (value: unknown): Element[] =>
  Array.isArray(value) ? (value.filter((item) => asDoc(item) !== null) as Element[]) : [];

const elementFields = (field: FieldLike, element: Element): FieldLike[] | null => {
  if (field.type !== "blocks") return field.fields ?? null;
  return field.blocks?.find((block) => block.slug === element.blockType)?.fields ?? null;
};

const TRANSPARENT = new Set(["row", "collapsible"]);
const TRANSLATABLE = new Set(["text", "textarea"]);

export const PAYLOAD_FIELDS_ID = "payload-fields";

function pairElement(targets: Element[], element: Element, index: number): Element | null {
  if (element.id !== undefined) {
    return targets.find((candidate) => candidate.id === element.id) ?? null;
  }
  return targets[index] ?? null;
}

export function payloadFieldsLanguage(): Language<FieldLike, SchemaCursor> {
  return {
    id: PAYLOAD_FIELDS_ID,

    enter({ context }) {
      const { fields, source, target } = context as {
        fields: FieldLike[];
        source: Doc;
        target: Doc;
      };
      return { nodes: fields, cursor: { source, target } };
    },

    step(field, cursor): Step<FieldLike, SchemaCursor> {
      if (TRANSPARENT.has(field.type)) {
        return {
          kind: "children",
          items: [{ nodes: field.fields ?? [], cursor, segments: [] }],
        };
      }
      if (field.type === "ui" || field.name === undefined) return { kind: "skip" };

      const name = field.name;

      if (field.type === "group") {
        const source = asDoc(cursor.source[name]);
        const target = asDoc(cursor.target[name]);
        if (source === null || target === null) return { kind: "skip" };
        return {
          kind: "children",
          items: [{ nodes: field.fields ?? [], cursor: { source, target }, segments: [name] }],
        };
      }

      if (field.type === "array" || field.type === "blocks") {
        const targets = asList(cursor.target[name]);
        const items = asList(cursor.source[name]).flatMap((element, index) => {
          const fields = elementFields(field, element);
          if (fields === null) return [];
          const paired = pairElement(targets, element, index);
          if (paired === null) return [];
          return [
            {
              nodes: fields,
              cursor: { source: element, target: paired },
              segments: [name, element.id ?? index],
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

    selects: (field) =>
      TRANSLATABLE.has(field.type) && field.localized === true && field.excluded !== true,

    isEmpty: (value) => (typeof value === "string" ? value.trim() === "" : value == null),

    textUnits: (leaf: TextLeaf): TextUnit[] => {
      const { value, setValue } = leaf;
      if (typeof value !== "string" || value.trim() === "" || setValue === undefined) return [];
      const write = setValue;
      return [{ text: value, write: (translated) => write(translated) }];
    },

    boundary(field, cursor): Crossing | null {
      if (field.type !== "richText" || field.name === undefined) return null;
      // Crossing happens before `selects`, so a boundary that skipped this would translate a field
      // its own host never marked for translation.
      if (field.localized !== true || field.excluded === true) return null;
      const tree = cursor.target[field.name];
      if (tree === undefined || tree === null) return null;

      const definitions = new Map(field.embeds?.map((embed) => [embed.slug, embed.fields]));
      if (field.richTextLanguage === undefined) return null;
      return {
        languageId: field.richTextLanguage,
        context: {
          tree,
          embed: (name: string, data: unknown): Crossing | null => {
            const fields = definitions.get(name);
            const doc = asDoc(data);
            if (fields === undefined || doc === null) return null;
            return {
              languageId: PAYLOAD_FIELDS_ID,
              context: { fields, source: doc, target: doc },
            };
          },
        },
      };
    },
  };
}
