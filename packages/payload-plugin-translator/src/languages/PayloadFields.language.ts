import { elementSegment, renderSegment } from "../core/domain/content-projection/idPath.js";
import { isTranslatableLeaf } from "../core/domain/content-projection/translatableLeaf.js";
import type {
  ArrayFieldLike,
  BlockLike,
  BlocksFieldLike,
  FieldLike,
} from "../core/kernel/field-traversal/index.js";
import {
  classifyField,
  resolveBlockFields,
  tabScopes,
} from "../core/kernel/field-traversal/index.js";
import type { SerializedLexicalRoot } from "../core/kernel/lexical/index.js";
import { isSerializedLexicalRoot } from "../core/kernel/lexical/index.js";
import { isEmpty } from "../core/kernel/utils/isEmpty.js";
import { isObject } from "../core/kernel/utils/isObject.js";
import type { EmbedKind, EmbedResolver, RichTextContext } from "./richTextCrossing.js";
import type {
  Crossing,
  Language,
  Step,
  StepChild,
  TextLeaf,
  TextUnit,
} from "../core/traversal/index.js";

/**
 * Two `Record<string, unknown>` the type cannot tell apart: `data` is the working copy — it decides
 * what is walked and receives every write; `source` supplies the text and each element's `id`.
 */
export type PayloadFieldsCursor = {
  data: Record<string, unknown>;
  source: Record<string, unknown>;
};

export const PAYLOAD_FIELDS_ID = "payload-fields";

const asObject = (value: unknown): Record<string, unknown> => (isObject(value) ? value : {});

const rendered = renderSegment;

const key = (name: string): string => rendered({ kind: "key", name });

type Child = StepChild<FieldLike, PayloadFieldsCursor>;

const intoObject = (name: string, fields: FieldLike[], cursor: PayloadFieldsCursor): Child[] => {
  const data = cursor.data[name];
  if (!isObject(data)) return [];
  return [
    {
      nodes: fields,
      cursor: { data, source: asObject(cursor.source[name]) },
      segments: [key(name)],
    },
  ];
};

const intoList = (
  field: ArrayFieldLike | BlocksFieldLike,
  name: string,
  cursor: PayloadFieldsCursor
): Child[] => {
  const data = cursor.data[name];
  if (!Array.isArray(data)) return [];

  const sourceArr = Array.isArray(cursor.source[name]) ? (cursor.source[name] as unknown[]) : [];
  const isBlocks = field.type === "blocks";

  return data.flatMap((item, index) => {
    if (!isObject(item)) return [];
    const fields = field.type === "blocks" ? resolveBlockFields(field, item) : field.fields;
    if (!fields) return [];

    const sourceItem = asObject(sourceArr[index]);
    return [
      {
        nodes: fields,
        cursor: { data: item, source: sourceItem },
        segments: [key(name), rendered(elementSegment(sourceItem, isBlocks, index))],
      },
    ];
  });
};

/**
 * Which rich-text language takes over at a `richText` field, and which blocks the host consents to
 * translate inside one.
 *
 * An unlisted block is skipped with no warning: absence is a statement, not an oversight.
 *
 * @public
 */
export type RichTextCrossing = {
  languageId: string;
  blocks: readonly BlockLike[];
  inlineBlocks: readonly BlockLike[];
};

const definitionsOf = (blocks: readonly BlockLike[]): Map<string, FieldLike[]> =>
  new Map(blocks.map((block) => [block.slug, block.fields]));

/**
 * Write-back mutates a rich-text tree in place, so the host's own source object must never be the
 * one handed over. The clone is taken from `source`, not from whatever the reconciler left in
 * `data` — that is what makes the crossing an overwrite rather than a re-translation of the
 * previous translation.
 */
const seatSourceClone = (
  cursor: PayloadFieldsCursor,
  name: string,
  source: SerializedLexicalRoot
): SerializedLexicalRoot => {
  const seated = structuredClone(source);
  cursor.data[name] = seated;
  return seated;
};

export function payloadFieldsLanguage(
  richText?: RichTextCrossing
): Language<FieldLike, PayloadFieldsCursor> {
  const definitions: Record<EmbedKind, Map<string, FieldLike[]>> = {
    block: definitionsOf(richText?.blocks ?? []),
    inlineBlock: definitionsOf(richText?.inlineBlocks ?? []),
  };

  const resolveEmbed: EmbedResolver = (kind, blockType, data) => {
    const fields = definitions[kind].get(blockType);
    if (fields === undefined) return null;
    return { languageId: PAYLOAD_FIELDS_ID, context: { fields, data, source: data } };
  };

  return {
    id: PAYLOAD_FIELDS_ID,

    enter({ context }) {
      const { fields, data, source } = context as {
        fields?: unknown;
        data?: unknown;
        source?: unknown;
      };
      if (!Array.isArray(fields) || !isObject(data) || !isObject(source)) return null;
      return { nodes: fields as FieldLike[], cursor: { data, source } };
    },

    step(field, cursor): Step<FieldLike, PayloadFieldsCursor> {
      const structure = classifyField(field);

      switch (structure.kind) {
        case "presentational":
          return { kind: "skip" };

        case "transparent":
          return { kind: "children", items: [{ nodes: structure.fields, cursor, segments: [] }] };

        case "tabs":
          return {
            kind: "children",
            items: tabScopes(structure.field).flatMap((scope) =>
              scope.named
                ? intoObject(scope.tab.name, scope.tab.fields, cursor)
                : [{ nodes: scope.fields, cursor, segments: [] }]
            ),
          };

        case "group":
          return {
            kind: "children",
            items: intoObject(structure.name, structure.fields, cursor),
          };

        case "array":
        case "blocks":
          return { kind: "children", items: intoList(structure.field, structure.name, cursor) };

        case "leaf": {
          const { name } = structure;
          if (cursor.data[name] === undefined || cursor.data[name] === null) {
            return { kind: "skip" };
          }
          return {
            kind: "value",
            value: cursor.source[name],
            segments: [key(name)],
            setValue: (value) => {
              cursor.data[name] = value;
            },
          };
        }

        default: {
          const exhaustive: never = structure;
          throw new Error(`unhandled field structure: ${String(exhaustive)}`);
        }
      }
    },

    selects: isTranslatableLeaf,

    isEmpty,

    textUnits: (leaf: TextLeaf): TextUnit[] => {
      const { value, setValue } = leaf;
      if (typeof value !== "string" || setValue === undefined) return [];
      const write = setValue;
      return [{ text: value, write: (translated) => write(translated) }];
    },

    boundary(field, cursor, value): Crossing | null {
      if (richText === undefined || field.type !== "richText" || field.name === undefined) {
        return null;
      }
      if (!isTranslatableLeaf(field) || !isSerializedLexicalRoot(value)) return null;

      const context: RichTextContext = {
        tree: seatSourceClone(cursor, field.name, value),
        embed: resolveEmbed,
      };
      return { languageId: richText.languageId, context };
    },
  };
}
