import type {
  VeDocument,
  VeFieldPatchMessage,
  VeFieldSnapshotMessage,
  VeRenderedFields,
} from "../../shared/protocol.js";
import type { FieldMatch, RichTextShape } from "../overlay/fieldTracker.js";

import { DATA_VE_LIVE_ATTR, VE_FIELD_SNAPSHOT_TYPE, VE_LIVE_OFF } from "../../shared/protocol.js";
import { fieldKeyOfMarker } from "../../shared/fieldKey.js";
import { documentAddressOf, fieldAddressOf, veDocumentOf } from "../../shared/veDocument.js";

export const REMEMBERED_SAVED_VALUES = 8;

export type LiveField = { document: VeDocument; key: string };

export type WriteText = (node: Text, text: string) => void;

export type WriteTextInHolder = (match: FieldMatch, text: string) => boolean;

export type KeepsShape = (richTextField: string, shape: string) => boolean;

export interface LiveFields {
  track(matches: readonly FieldMatch[]): void;
  release(matches: readonly FieldMatch[]): void;
  apply(message: VeFieldSnapshotMessage | VeFieldPatchMessage): void;
  takeNewlyRendered(): VeRenderedFields[];
  takeAllRendered(): VeRenderedFields[];
  holdsValueOf(document: VeDocument, key: string): boolean;
  holdsFormOf(document: VeDocument): boolean;
  holdsAnyForm(): boolean;
}

type KnownValues = { unsaved: string; saved: readonly string[] };

type LiveFieldOnPage = {
  field: LiveField;
  nodes: Set<Text>;
  emptiedHolders: Set<FieldMatch>;
  values: KnownValues | null;
};

type ShapesOfField = { renderedLast: string; fieldsByShape: Map<string, Set<string>> };

const LIVE_PATCHING_OFF = `[${DATA_VE_LIVE_ATTR}="${VE_LIVE_OFF}"]`;

const optedOutOfLivePatching = (node: Text) =>
  Boolean(node.parentElement?.closest(LIVE_PATCHING_OFF));

const withSavedValue = (values: KnownValues | null, saved: string): KnownValues => {
  if (!values) return { unsaved: saved, saved: [saved] };
  const earlier = values.saved.filter((value) => value !== saved);
  return { unsaved: values.unsaved, saved: [...earlier, saved].slice(-REMEMBERED_SAVED_VALUES) };
};

const isRawRender = (values: KnownValues, node: Text): boolean => {
  const renderedText = node.textContent ?? "";
  return renderedText === values.unsaved || values.saved.includes(renderedText);
};

const WHITESPACE_RUN = /\s+/gu;

const collapsedWhitespace = (text: string) => text.replaceAll(WHITESPACE_RUN, " ").trim();

const showsRawRenderIn = (values: KnownValues, holder: Element): boolean => {
  const shownText = collapsedWhitespace(holder.textContent ?? "");
  return [values.unsaved, ...values.saved].some(
    (value) => collapsedWhitespace(value) === shownText
  );
};

export const renderedByDocument = (fields: readonly LiveField[]): VeRenderedFields[] => {
  const grouped = new Map<string, VeRenderedFields>();
  for (const { document, key } of fields) {
    const documentAddress = documentAddressOf(document);
    const fieldsOfDocument = grouped.get(documentAddress) ?? { ...document, keys: [] };
    fieldsOfDocument.keys.push(key);
    grouped.set(documentAddress, fieldsOfDocument);
  }
  return [...grouped.values()];
};

export function createLiveFields(
  writeText: WriteText,
  keepsShape: KeepsShape = () => false,
  writeTextInHolder: WriteTextInHolder = () => false
): LiveFields {
  const fieldsOnPage = new Map<string, LiveFieldOnPage>();
  const unannounced = new Set<string>();
  const shapesByRichText = new Map<string, ShapesOfField>();
  const richTextsWithEarlierShapes = new Set<string>();
  const documentsWithValues = new Set<string>();

  const show = (node: Text, value: string) => {
    if (node.textContent !== value) writeText(node, value);
  };

  const releaseNode = (match: FieldMatch) => {
    const key = fieldKeyOfMarker(match);
    const onPage = key === null ? undefined : fieldsOnPage.get(fieldAddressOf(match, key));
    if (!onPage) return;
    onPage.nodes.delete(match.textNode);
    if (match.holder) onPage.emptiedHolders.add(match);
  };

  const showUnsavedInEmptiedHolders = (
    onPage: LiveFieldOnPage,
    values: KnownValues,
    unsaved: string
  ) => {
    for (const match of onPage.emptiedHolders) {
      const { holder } = match;
      if (!holder?.isConnected) {
        onPage.emptiedHolders.delete(match);
        continue;
      }
      const isShown =
        collapsedWhitespace(holder.textContent ?? "") === collapsedWhitespace(unsaved);
      if (isShown || !showsRawRenderIn(values, holder)) continue;
      onPage.emptiedHolders.delete(match);
      writeTextInHolder(match, unsaved);
    }
  };

  const showUnsaved = (onPage: LiveFieldOnPage, values: KnownValues, unsaved: string) => {
    const rawNodes = [...onPage.nodes].filter(
      (node) => node.isConnected && isRawRender(values, node)
    );
    onPage.values = { ...values, unsaved };
    for (const node of rawNodes) show(node, unsaved);
    showUnsavedInEmptiedHolders(onPage, values, unsaved);
  };

  const recordShape = ({ field }: LiveFieldOnPage, { fieldKey, shape }: RichTextShape) => {
    const richText = fieldAddressOf(field.document, fieldKey);
    const shapes = shapesByRichText.get(richText) ?? {
      renderedLast: shape,
      fieldsByShape: new Map(),
    };
    const fieldsOfShape = shapes.fieldsByShape.get(shape) ?? new Set<string>();
    fieldsOfShape.add(fieldAddressOf(field.document, field.key));
    shapes.fieldsByShape.set(shape, fieldsOfShape);
    shapes.renderedLast = shape;
    shapesByRichText.set(richText, shapes);
    if (shapes.fieldsByShape.size > 1) richTextsWithEarlierShapes.add(richText);
  };

  const trackNode = ({ textNode, richText, holder: _holder, ...marker }: FieldMatch) => {
    const key = fieldKeyOfMarker(marker);
    if (key === null || marker.locale !== undefined || optedOutOfLivePatching(textNode)) return;
    const field = { document: veDocumentOf(marker), key };
    const fieldAddress = fieldAddressOf(field.document, key);
    let onPage = fieldsOnPage.get(fieldAddress);
    if (!onPage) {
      onPage = { emptiedHolders: new Set(), field, nodes: new Set(), values: null };
      fieldsOnPage.set(fieldAddress, onPage);
      unannounced.add(fieldAddress);
    }
    onPage.nodes.add(textNode);
    if (onPage.values && isRawRender(onPage.values, textNode)) {
      show(textNode, onPage.values.unsaved);
    }
    if (richText) recordShape(onPage, richText);
  };

  const isRenderedByANode = (fieldAddress: string) =>
    (fieldsOnPage.get(fieldAddress)?.nodes.size ?? 0) > 0;

  const forgetEarlierShapesOf = (richText: string, shapes: ShapesOfField) => {
    for (const [shape, fieldsOfShape] of shapes.fieldsByShape) {
      if (shape === shapes.renderedLast || keepsShape(richText, shape)) continue;
      for (const fieldAddress of fieldsOfShape) {
        if (isRenderedByANode(fieldAddress)) continue;
        fieldsOfShape.delete(fieldAddress);
        fieldsOnPage.delete(fieldAddress);
        unannounced.delete(fieldAddress);
      }
      if (fieldsOfShape.size === 0) shapes.fieldsByShape.delete(shape);
    }
  };

  const forgetReplacedShapes = () => {
    for (const richText of richTextsWithEarlierShapes) {
      const shapes = shapesByRichText.get(richText);
      if (!shapes) continue;
      forgetEarlierShapesOf(richText, shapes);
      if (shapes.fieldsByShape.size === 1) richTextsWithEarlierShapes.delete(richText);
    }
  };

  const fieldsOf = (addresses: Iterable<string>) =>
    [...addresses].flatMap((address) => fieldsOnPage.get(address)?.field ?? []);

  return {
    track(matches) {
      for (const match of matches) trackNode(match);
      forgetReplacedShapes();
    },
    release(matches) {
      for (const match of matches) releaseNode(match);
    },
    apply(message) {
      if (message.type === VE_FIELD_SNAPSHOT_TYPE) {
        for (const { key, saved, value } of message.fields) {
          const onPage = fieldsOnPage.get(fieldAddressOf(message, key));
          if (!onPage) continue;
          showUnsaved(onPage, withSavedValue(onPage.values, saved), value);
          documentsWithValues.add(documentAddressOf(message));
        }
        return;
      }
      for (const { key, value } of message.patches) {
        const onPage = fieldsOnPage.get(fieldAddressOf(message, key));
        if (onPage?.values) showUnsaved(onPage, onPage.values, value);
      }
    },
    takeNewlyRendered() {
      const newFields = fieldsOf(unannounced);
      unannounced.clear();
      return renderedByDocument(newFields);
    },
    takeAllRendered() {
      unannounced.clear();
      return renderedByDocument(fieldsOf(fieldsOnPage.keys()));
    },
    holdsValueOf(document, key) {
      return Boolean(fieldsOnPage.get(fieldAddressOf(document, key))?.values);
    },
    holdsFormOf(document) {
      return documentsWithValues.has(documentAddressOf(document));
    },
    holdsAnyForm() {
      return documentsWithValues.size > 0;
    },
  };
}
