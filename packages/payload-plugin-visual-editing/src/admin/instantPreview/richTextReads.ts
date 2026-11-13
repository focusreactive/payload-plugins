import type { VeDocument } from "../../shared/protocol.js";
import type { FormField } from "./formFields.js";

import { isRichTextNodeKey, richTextNodeKeyOf } from "../../shared/richText/nodeKey.js";
import { shapeOf } from "../../shared/richText/shapeOf.js";
import { textLeavesOf } from "../../shared/richText/textLeaves.js";
import { rootOf } from "../../shared/richText/editorNodes.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { fieldAddressOf } from "../../shared/veDocument.js";
import { valueAtSteps } from "../../shared/fieldKey.js";

type RichTextField = { current: unknown; document: VeDocument; fieldKey: string; saved: unknown };

type OpenDocument = { document: VeDocument; savedDocument: unknown };

export type RichTextNodeText = { inEditor: string | null; key: string; saved: string };

export type RichTextRead = {
  current: unknown;
  editorShape: string | null;
  fieldAddress: string;
  fieldKey: string;
  nodeTexts: RichTextNodeText[];
  savedShape: string | null;
};

type ReadRichText = (field: RichTextField) => RichTextRead;

const nodeTextsOf = (
  { current, fieldKey, saved }: RichTextField,
  shape: string,
  editorHoldsSavedShape: boolean
): RichTextNodeText[] => {
  const editorLeaves = editorHoldsSavedShape ? textLeavesOf(current) : [];
  return textLeavesOf(saved).map(({ address, text }, position) => {
    const editorLeaf = editorLeaves[position];
    return {
      inEditor: editorLeaf?.address === address ? editorLeaf.text : null,
      key: richTextNodeKeyOf({ address, fieldKey, shape }),
      saved: text,
    };
  });
};

const readRichText = (field: RichTextField): RichTextRead => {
  const fieldAddress = fieldAddressOf(field.document, field.fieldKey);
  const savedShape = shapeOf(field.saved, fieldAddress);
  const editorShape = shapeOf(field.current, fieldAddress);
  const nodeTexts =
    savedShape === null ? [] : nodeTextsOf(field, savedShape, editorShape === savedShape);
  return {
    current: field.current,
    editorShape,
    fieldAddress,
    fieldKey: field.fieldKey,
    nodeTexts,
    savedShape,
  };
};

export const createRichTextReads = (): ReadRichText => {
  const lastReadOfEditorState = new WeakMap<object, { read: RichTextRead; saved: unknown }>();

  return (field) => {
    if (!isPlainObject(field.current)) return readRichText(field);
    const lastRead = lastReadOfEditorState.get(field.current);
    const isReadBefore =
      lastRead?.read.fieldAddress === fieldAddressOf(field.document, field.fieldKey) &&
      lastRead.saved === field.saved;
    if (isReadBefore) return lastRead.read;
    const read = readRichText(field);
    lastReadOfEditorState.set(field.current, { read, saved: field.saved });
    return read;
  };
};

const canHaveNodeKeys = ({ key, value }: FormField) =>
  rootOf(value) !== null && !isRichTextNodeKey(key);

export const createRichTextFieldReads = () => {
  const readAgainstSavedDocument = createRichTextReads();

  return (formFields: readonly FormField[], { document, savedDocument }: OpenDocument) =>
    formFields.filter(canHaveNodeKeys).flatMap(({ key, steps, value }) => {
      const savedField = valueAtSteps(savedDocument, steps);
      if (!savedField) return [];
      return readAgainstSavedDocument({
        current: value,
        document,
        fieldKey: key,
        saved: savedField.value,
      });
    });
};
