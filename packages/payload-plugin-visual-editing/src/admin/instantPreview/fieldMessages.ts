import type {
  VeFieldPatch,
  VeFieldPatchMessage,
  VeFieldSnapshotEntry,
  VeFieldSnapshotMessage,
  VeLiveDocument,
} from "../../shared/protocol.js";
import type { FormField } from "./formFields.js";
import type { RichTextNodeText } from "./richTextReads.js";

import { VE_FIELD_PATCH_TYPE, VE_FIELD_SNAPSHOT_TYPE } from "../../shared/protocol.js";
import { valueAtSteps } from "../../shared/fieldKey.js";

export const REMEMBERED_TYPED_TEXTS = 128;

export type FieldValues = ReadonlyMap<string, unknown>;

type TextsSinceSave = { saved: string; typed: readonly string[] };

export type NodeTexts = ReadonlyMap<string, TextsSinceSave>;

export type FieldsRead = {
  formFields: readonly FormField[];
  richTextNodes: readonly VeFieldSnapshotEntry[];
};

type OpenDocument = { document: VeLiveDocument; savedDocument: unknown };

type IsToSend = (field: { key: string }) => boolean;

const NOT_TYPED = -1;

const typedAfter = (known: TextsSinceSave | undefined, saved: string): readonly string[] => {
  if (!known) return [];
  if (known.saved === saved) return known.typed;
  const savedAt = known.typed.indexOf(saved);
  return savedAt === NOT_TYPED ? [] : known.typed.slice(savedAt + 1);
};

const lastTextOf = ({ saved, typed }: TextsSinceSave): string => typed.at(-1) ?? saved;

const textsSinceSave = (
  known: TextsSinceSave | undefined,
  { inEditor, saved }: RichTextNodeText
): TextsSinceSave => {
  const texts = { saved, typed: typedAfter(known, saved) };
  if (inEditor === null || inEditor === lastTextOf(texts)) return texts;
  return { saved, typed: [...texts.typed, inEditor].slice(-REMEMBERED_TYPED_TEXTS) };
};

export const textsSinceSaveOf = (nodes: readonly RichTextNodeText[], known: NodeTexts): NodeTexts =>
  new Map(nodes.map((node) => [node.key, textsSinceSave(known.get(node.key), node)]));

export const snapshotEntriesOf = (nodeTexts: NodeTexts): VeFieldSnapshotEntry[] =>
  Array.from(nodeTexts, ([key, texts]) => ({ key, saved: texts.saved, value: lastTextOf(texts) }));

const isCleared = (value: unknown) => value === null || value === undefined;

const asEditableText = (value: unknown, counterpart: unknown): string | null => {
  if (typeof value === "string") return value;
  return isCleared(value) && typeof counterpart === "string" ? "" : null;
};

const editableTextPair = (value: unknown, counterpart: unknown): [string, string] | null => {
  const text = asEditableText(value, counterpart);
  const counterpartText = asEditableText(counterpart, value);
  return text === null || counterpartText === null ? null : [text, counterpartText];
};

const formSnapshotEntries = (
  formFields: readonly FormField[],
  savedDocument: unknown
): VeFieldSnapshotEntry[] =>
  formFields.flatMap(({ key, steps, value }) => {
    const savedField = valueAtSteps(savedDocument, steps);
    const texts = savedField && editableTextPair(savedField.value, value);
    return texts ? [{ key, saved: texts[0], value: texts[1] }] : [];
  });

const patchesBetween = (previous: FieldValues, next: FieldValues): VeFieldPatch[] =>
  [...next].flatMap(([key, value]) => {
    const texts = previous.has(key) ? editableTextPair(value, previous.get(key)) : null;
    return texts && texts[0] !== texts[1] ? [{ key, value: texts[0] }] : [];
  });

export const snapshotOf = (
  { document, savedDocument }: OpenDocument,
  { formFields, richTextNodes }: FieldsRead,
  isToSend: IsToSend
): VeFieldSnapshotMessage | null => {
  const fields = [
    ...formSnapshotEntries(formFields.filter(isToSend), savedDocument),
    ...richTextNodes.filter(isToSend),
  ];
  return fields.length > 0 ? { type: VE_FIELD_SNAPSHOT_TYPE, ...document, fields } : null;
};

export const patchOf = (
  document: VeLiveDocument,
  previous: FieldValues,
  values: FieldValues,
  isToSend: IsToSend
): VeFieldPatchMessage | null => {
  const patches = patchesBetween(previous, values).filter(isToSend);
  return patches.length > 0 ? { type: VE_FIELD_PATCH_TYPE, ...document, patches } : null;
};
