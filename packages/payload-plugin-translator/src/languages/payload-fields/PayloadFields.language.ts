import { elementSegment, renderSegment } from "../../core/domain/content-projection/idPath.js";
import {
  isLocalizedFieldLike,
  isTranslatableLeaf,
} from "../../core/domain/content-projection/translatableLeaf.js";
import { isFieldExcludedFromTranslation } from "../../core/domain/field-config/index.js";
import type {
  ArrayFieldLike,
  BlockLike,
  BlocksFieldLike,
  FieldLike,
} from "../../core/kernel/field-traversal/index.js";
import {
  classifyField,
  resolveBlockFields,
  tabScopes,
} from "../../core/kernel/field-traversal/index.js";
import { isEmpty } from "../../core/kernel/utils/isEmpty.js";
import { isObject } from "../../core/kernel/utils/isObject.js";
import type { ContentCrossing } from "../contentCrossing.js";
import type { EmbedResolver } from "../embedCrossing.js";
import type {
  Crossing,
  Language,
  Step,
  StepChild,
  TextLeaf,
  TextUnit,
} from "../../core/traversal/index.js";

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
 * A block missing from `blocks` is skipped with no warning: absence is a statement, not an
 * oversight.
 *
 * @public
 */
export type PayloadFieldsConfig = {
  /** Asked in order; the first that does not answer `null` takes the value. */
  crossings?: readonly ContentCrossing[];
  /**
   * Every block that may be entered, by slug, whatever kind of embed carries it. One list rather
   * than one per kind: this host needs a definition, and which kind is present comes from the data.
   */
  blocks?: readonly BlockLike[];
};

/**
 * Weaker than {@link isTranslatableLeaf} on purpose: it omits the field-type rule, because which
 * formats a value may be handed to is the crossing list's question, not the field type's.
 */
const isOfferable = (field: FieldLike): boolean =>
  isLocalizedFieldLike(field) && !isFieldExcludedFromTranslation(field);

const definitionsOf = (blocks: readonly BlockLike[]): Map<string, FieldLike[]> =>
  new Map(blocks.map((block) => [block.slug, block.fields]));

export function payloadFieldsLanguage(
  config: PayloadFieldsConfig = {}
): Language<FieldLike, PayloadFieldsCursor> {
  const crossings = config.crossings ?? [];
  const blocks = definitionsOf(config.blocks ?? []);

  const resolveEmbed: EmbedResolver = ({ name, data }) => {
    const fields = blocks.get(name);
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
            slot: { holder: cursor.data, key: name },
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
      const { value, slot } = leaf;
      if (typeof value !== "string" || slot === undefined) return [];
      return [{ text: value, resolve: (translated) => [{ slot, value: translated }] }];
    },

    boundary(field, cursor, value): Crossing | null {
      const { name } = field;
      if (name === undefined || !isOfferable(field)) return null;

      for (const crossing of crossings) {
        const opened = crossing.open({ value, embed: resolveEmbed });
        if (opened === null) continue;

        const { languageId } = crossing;
        const { context } = opened;
        if (opened.workingCopy === undefined) return { languageId, context };
        return {
          languageId,
          context,
          placement: { slot: { holder: cursor.data, key: name }, value: opened.workingCopy },
        };
      }
      return null;
    },
  };
}
