import type { RichTextNodeMarker } from "../../shared/richText/nodeKey.js";
import type { VeIdentity } from "../../shared/shared.js";

import { vercelStegaDecode } from "@vercel/stega";

import {
  DATA_VE_LOCALE_ATTR,
  DATA_VE_PATH_ATTR,
  DATA_VE_VALUE_ID_ATTR,
  VE_IDENTITY_ATTRS,
} from "../../shared/protocol.js";
import { fieldKeyOfMarker } from "../../shared/fieldKey.js";
import { fromRichTextNodeMarker, richTextNodeKeyOf } from "../../shared/richText/nodeKey.js";
import { fromStegaPayload, leadingWhitespaceOfPayload } from "../../shared/shared.js";
import {
  hasMarker,
  leadingWhitespaceOf,
  textAfterMarker,
  withoutMarker,
} from "../../shared/stegaText.js";
import { documentAddressOf } from "../../shared/veDocument.js";
import { identityAttrsOf } from "../withVisualEditingPath.js";
import { readMarkerFromAttrs } from "./markerExtractor.js";
import { createMutationPipeline } from "./mutationPipeline.js";
import { markedAttributesIn, visibleTextNodesIn } from "./pageNodes.js";

export type RichTextShape = { fieldKey: string; shape: string };

export type FieldMatch = VeIdentity & {
  textNode: Text;
  richText?: RichTextShape;
  holder?: Element;
};

export type FieldListener = {
  onFields(root: Element, matches: readonly FieldMatch[]): void;
  onNodesReleased?(matches: readonly FieldMatch[]): void;
  onContentRemoved?(): void;
};

export type FieldEdit = {
  shownText(): string;
  onShownAgain(): void;
};

export type WhitespaceAround = { before: string; after: string };

export interface FieldTracker {
  subscribe(listener: FieldListener): () => void;
  whitespaceAround(match: FieldMatch): WhitespaceAround;
  showText(node: Text, text: string): void;
  showTextInHolder(match: FieldMatch, text: string): boolean;
  joinSplitText(holder: Element, mayJoin: (match: FieldMatch) => boolean): FieldMatch | null;
  beginEdit(match: FieldMatch, edit: FieldEdit): HTMLElement | null;
  endEdit(match: FieldMatch, text: string): void;
  isIdentifiedByThePage(element: Element): boolean;
  namesUploadOf(element: Element): boolean;
  dispose(): void;
}

type TrackedText = {
  original: string;
  ownWritesToObserve: number;
  nodeMarker: RichTextNodeMarker | null;
  match: FieldMatch | null;
};

type HeldField = { match: FieldMatch; original: string };

const CLICKABLE = "a, button";

const RICH_TEXT_WRAPPER = `[${DATA_VE_PATH_ATTR}]`;

const payloadIn = (text: string): unknown =>
  hasMarker(text) ? vercelStegaDecode(text) : undefined;

const richTextMatchOf = (
  textNode: Text,
  { node, shape }: RichTextNodeMarker
): FieldMatch | null => {
  const wrapper = textNode.parentElement?.closest<HTMLElement>(RICH_TEXT_WRAPPER);
  const field = wrapper && readMarkerFromAttrs(wrapper);
  if (!wrapper || !field || wrapper.hasAttribute(DATA_VE_LOCALE_ATTR)) return null;
  const fieldKey = fieldKeyOfMarker(field);
  if (fieldKey === null) return null;
  const key = richTextNodeKeyOf({ address: node, fieldKey, shape });
  return { ...field, key, richText: { fieldKey, shape }, textNode };
};

const isSameNodeKey = (known: FieldMatch | null, match: FieldMatch) =>
  known !== null &&
  known.key === match.key &&
  documentAddressOf(known) === documentAddressOf(match);

const isSameField = (one: VeIdentity, other: VeIdentity): boolean =>
  fieldKeyOfMarker(one) === fieldKeyOfMarker(other) &&
  one.locale === other.locale &&
  documentAddressOf(one) === documentAddressOf(other);

const IMAGE_DESCRIPTION_ATTR = "alt";

const IMAGES = "img";

const MARKED = `[${DATA_VE_PATH_ATTR}]`;

const IMAGE_IDENTITY_ATTRS = [...VE_IDENTITY_ATTRS, DATA_VE_VALUE_ID_ATTR];

const isWrittenByThePage = (element: Element, attr: string, original: string): boolean =>
  hasMarker(original) && element.getAttribute(attr) !== withoutMarker(original);

const restoreAttrs = (element: Element, originals: ReadonlyMap<string, string | null>) => {
  for (const [attr, value] of originals) {
    if (value === null) element.removeAttribute(attr);
    else if (!isWrittenByThePage(element, attr, value)) element.setAttribute(attr, value);
  }
};

const identityOfDescription = (value: string): Record<string, string | undefined> => {
  const field = fromStegaPayload(payloadIn(value));
  if (!field) return {};
  return {
    ...identityAttrsOf(field),
    ...(field.valueId !== undefined && { [DATA_VE_VALUE_ID_ATTR]: field.valueId }),
  };
};

const textBearingChildrenOf = (element: Element): ChildNode[] =>
  Array.from(element.childNodes).filter((child) =>
    child instanceof Element ? child.textContent !== "" : child instanceof Text
  );

const showOnlyText = (holder: Element, textNode: Text): void => {
  const [first, ...rest] = textBearingChildrenOf(holder);
  if (first) first.replaceWith(textNode);
  else holder.prepend(textNode);
  for (const child of rest) child.remove();
};

const LINE_BREAK_TAG = "BR";

const isLeftByAnEdit = (child: ChildNode): boolean =>
  child instanceof Text || (child instanceof Element && child.tagName === LINE_BREAK_TAG);

type TextEdit = FieldEdit & {
  editedElement: HTMLElement;
  present: ReadonlySet<ChildNode>;
  nextSibling: ChildNode | null;
  before: string;
  after: string;
};

const showOnlyEditedText = ({ editedElement, nextSibling, present }: TextEdit, textNode: Text) => {
  for (const child of Array.from(editedElement.childNodes)) {
    if (child !== textNode && !present.has(child) && isLeftByAnEdit(child)) child.remove();
  }
  if (textNode.parentNode === editedElement) return;
  if (nextSibling?.parentNode === editedElement) nextSibling.before(textNode);
  else editedElement.append(textNode);
};

const holderCandidateOf = (textNode: Text): Element | null => {
  const parent = textNode.parentElement;
  return parent?.closest(CLICKABLE) ?? parent;
};

const showsOnlyText = (element: Element, text: string) =>
  withoutMarker(element.textContent ?? "") === text;

const isBlankText = (node: ChildNode): boolean => node instanceof Text && node.data.trim() === "";

const isTheOnlyTextOf = (element: Element, textNode: Text): boolean =>
  textNode.parentElement === element &&
  Array.from(element.childNodes).every(
    (child) => child === textNode || child instanceof Element || isBlankText(child)
  );

const WHITESPACE_RUN = /\s+/gu;

const comparableText = (text: string): string => text.replaceAll(WHITESPACE_RUN, " ").trim();

const NO_WHITESPACE_AROUND: WhitespaceAround = { after: "", before: "" };

const TRAILING_WHITESPACE = /\s*$/u;

const whitespaceAroundTheValue = (shown: string, original: string): WhitespaceAround => {
  const leading = leadingWhitespaceOf(shown);
  const leadingOfTheValue = leadingWhitespaceOfPayload(payloadIn(original));
  const before = leading.slice(0, Math.max(0, leading.length - leadingOfTheValue));
  const [trailing = ""] = TRAILING_WHITESPACE.exec(textAfterMarker(original) ?? shown) ?? [];
  const isBesideTheValue =
    shown.endsWith(trailing) && shown.length - trailing.length >= before.length;
  return { after: isBesideTheValue ? trailing : "", before };
};

export function createFieldTracker(main: HTMLElement): FieldTracker {
  const texts = new Map<Text, TrackedText>();
  const attrOriginals = new Map<Element, Map<string, string | null>>();
  const holders = new Map<Element, HeldField>();
  const sharedHolders = new WeakSet<Element>();
  const ownAttributeWrites = new Map<Element, number>();
  const listeners = new Set<FieldListener>();
  const edits = new Map<Text, TextEdit>();

  const whitespaceAround = (textNode: Text, editedElement: Element): WhitespaceAround =>
    editedElement.childElementCount === 0
      ? NO_WHITESPACE_AROUND
      : whitespaceAroundTheValue(textNode.data, texts.get(textNode)?.original ?? textNode.data);

  const isSplitIntoPlainElements = (holder: Element, text: string): boolean => {
    if (holder.childElementCount === 0 || holder.querySelector(MARKED) !== null) return false;
    const pieces = [...visibleTextNodesIn(holder)];
    if (pieces.some((piece) => texts.has(piece) || hasMarker(piece.data))) return false;
    return comparableText(holder.textContent ?? "") === comparableText(text);
  };

  const showFieldInHolder = (holder: Element, held: HeldField, text: string): FieldMatch => {
    const { holder: _holder, textNode: _textNode, ...field } = held.match;
    const textNode = document.createTextNode(text);
    const shown = { ...field, holder, textNode };
    showOnlyText(holder, textNode);
    texts.set(textNode, {
      match: shown,
      nodeMarker: null,
      original: held.original,
      ownWritesToObserve: 0,
    });
    holders.set(holder, { match: shown, original: held.original });
    for (const listener of listeners) listener.onFields(holder, [shown]);
    return shown;
  };

  const writeIdentityAttr = (element: Element, attr: string, value: string | null) => {
    if (element.getAttribute(attr) === value) return;
    ownAttributeWrites.set(element, (ownAttributeWrites.get(element) ?? 0) + 1);
    if (value === null) element.removeAttribute(attr);
    else element.setAttribute(attr, value);
  };

  const isOwnAttributeWrite = (element: Element) => {
    const writes = ownAttributeWrites.get(element) ?? 0;
    if (writes === 0) return false;
    if (writes === 1) ownAttributeWrites.delete(element);
    else ownAttributeWrites.set(element, writes - 1);
    return true;
  };

  const release = (matches: readonly FieldMatch[]) => {
    if (matches.length === 0) return;
    for (const listener of listeners) listener.onNodesReleased?.(matches);
  };

  const forget = (textNode: Text) => {
    const tracked = texts.get(textNode);
    if (!tracked) return;
    texts.delete(textNode);
    if (tracked.match) release([tracked.match]);
  };

  const unstamp = (holder: Element) => {
    const originals = attrOriginals.get(holder);
    holders.delete(holder);
    sharedHolders.delete(holder);
    if (!originals) return;
    for (const attr of VE_IDENTITY_ATTRS) {
      const value = originals.get(attr);
      if (value === undefined) continue;
      writeIdentityAttr(holder, attr, value);
      originals.delete(attr);
    }
  };

  const stamp = (holder: Element, held: HeldField) => {
    const originals = attrOriginals.get(holder) ?? new Map<string, string | null>();
    const identity: Record<string, string | undefined> = identityAttrsOf(held.match);
    for (const attr of VE_IDENTITY_ATTRS) {
      if (!originals.has(attr)) originals.set(attr, holder.getAttribute(attr));
      writeIdentityAttr(holder, attr, identity[attr] ?? null);
    }
    attrOriginals.set(holder, originals);
    holders.set(holder, held);
  };

  const holderOf = (textNode: Text): Element | null => {
    const candidate = holderCandidateOf(textNode);
    if (!candidate || candidate === main || !main.contains(candidate)) return null;
    const isStampedHere = holders.has(candidate);
    if (!isStampedHere && candidate.hasAttribute(DATA_VE_PATH_ATTR)) return null;
    if (showsOnlyText(candidate, textNode.data)) return candidate;
    if (isTheOnlyTextOf(candidate, textNode)) {
      sharedHolders.add(candidate);
      return candidate;
    }
    if (isStampedHere) unstamp(candidate);
    return null;
  };

  const record = (textNode: Text): TrackedText | null => {
    const original = textNode.data;
    const payload = payloadIn(original);
    const field = fromStegaPayload(payload);
    const nodeMarker = fromRichTextNodeMarker(payload);
    if (!field && !nodeMarker) return null;
    textNode.data = withoutMarker(original);
    const holder = field && !nodeMarker ? holderOf(textNode) : null;
    const match = field && { ...field, textNode, ...(holder && { holder }) };
    if (holder && match) stamp(holder, { match, original });
    const tracked = { match, original, ownWritesToObserve: 1, nodeMarker };
    texts.set(textNode, tracked);
    return tracked;
  };

  const isIdentifiedByThePage = (element: Element): boolean => {
    const isWrittenHere = attrOriginals.get(element)?.get(DATA_VE_PATH_ATTR) === null;
    return element.hasAttribute(DATA_VE_PATH_ATTR) && !isWrittenHere;
  };

  const isWrappedByThePage = (image: Element): boolean => {
    const wrapper = image.parentElement?.closest(MARKED) ?? null;
    return (
      wrapper !== null &&
      isIdentifiedByThePage(wrapper) &&
      wrapper.querySelectorAll(IMAGES).length === 1
    );
  };

  const identifyImage = (
    element: Element,
    originals: Map<string, string | null>,
    value: string
  ) => {
    const isIdentifiedHere = originals.get(DATA_VE_PATH_ATTR) === null && !holders.has(element);
    if (!isIdentifiedHere && element.hasAttribute(DATA_VE_PATH_ATTR)) return;
    if (isWrappedByThePage(element)) return;
    const identity = identityOfDescription(value);
    for (const attr of IMAGE_IDENTITY_ATTRS) {
      const shown = identity[attr];
      if (shown !== undefined) {
        originals.set(attr, null);
        element.setAttribute(attr, shown);
      } else if (originals.get(attr) === null) {
        originals.delete(attr);
        element.removeAttribute(attr);
      }
    }
  };

  const recordAttr = (element: Element, { name, value }: Attr) => {
    const cleaned = withoutMarker(value);
    if (cleaned === value) return;
    const originals = attrOriginals.get(element) ?? new Map<string, string | null>();
    if (name === IMAGE_DESCRIPTION_ATTR) identifyImage(element, originals, value);
    originals.set(name, value);
    attrOriginals.set(element, originals);
    element.setAttribute(name, cleaned);
  };

  const identify = (textNode: Text, released: FieldMatch[], found: FieldMatch[]) => {
    const known = texts.get(textNode);
    const tracked = known ?? record(textNode);
    if (!tracked?.nodeMarker) {
      if (!known && tracked?.match) found.push(tracked.match);
      return;
    }
    const match = richTextMatchOf(textNode, tracked.nodeMarker);
    if (known && match && isSameNodeKey(tracked.match, match)) return;
    if (tracked.match) released.push(tracked.match);
    tracked.match = match;
    if (match) found.push(match);
  };

  const scan = (root: Element) => {
    if (!root.isConnected) return;
    const released: FieldMatch[] = [];
    const found: FieldMatch[] = [];
    for (const textNode of visibleTextNodesIn(root)) identify(textNode, released, found);
    for (const [element, attr] of markedAttributesIn(root)) recordAttr(element, attr);
    release(released);
    for (const listener of listeners) listener.onFields(root, found);
  };

  const showEditedTextAgain = (
    textNode: Text,
    tracked: TrackedText,
    edit: TextEdit,
    rendered = textNode.data
  ) => {
    tracked.original = rendered;
    const holder = tracked.match?.holder;
    if (holder && tracked.match) holders.set(holder, { match: tracked.match, original: rendered });
    showOnlyEditedText(edit, textNode);
    const shown = `${edit.before}${edit.shownText()}${edit.after}`;
    if (textNode.data !== shown) {
      tracked.ownWritesToObserve += 1;
      textNode.data = shown;
    }
    edit.onShownAgain();
  };

  const isRenderOf = (tracked: TrackedText, child: ChildNode): child is Text => {
    if (!(child instanceof Text) || texts.has(child)) return false;
    const field = fromStegaPayload(payloadIn(child.data));
    return field !== null && tracked.match !== null && isSameField(tracked.match, field);
  };

  const renderedInsteadOf = (tracked: TrackedText, { editedElement }: TextEdit) =>
    Array.from(editedElement.childNodes).find((child) => isRenderOf(tracked, child));

  const showEditedTextInsteadOfTheRender = (
    textNode: Text,
    tracked: TrackedText,
    edit: TextEdit
  ): boolean => {
    const rendered = main.contains(edit.editedElement) && renderedInsteadOf(tracked, edit);
    if (!rendered) return false;
    rendered.replaceWith(textNode);
    showEditedTextAgain(textNode, tracked, edit, rendered.data);
    return true;
  };

  const showEditedTextInsteadOfTheSplit = (
    textNode: Text,
    tracked: TrackedText,
    edit: TextEdit
  ): boolean => {
    const { editedElement } = edit;
    if (tracked.match?.holder !== editedElement || sharedHolders.has(editedElement)) return false;
    const shown = `${edit.before}${edit.shownText()}${edit.after}`;
    if (!main.contains(editedElement) || !isSplitIntoPlainElements(editedElement, shown)) {
      return false;
    }
    showOnlyText(editedElement, textNode);
    showEditedTextAgain(textNode, tracked, edit, tracked.original);
    return true;
  };

  const releaseDetachedNodes = () => {
    const released: FieldMatch[] = [];
    for (const [textNode, tracked] of texts) {
      if (main.contains(textNode)) continue;
      const edit = edits.get(textNode);
      if (
        edit &&
        (showEditedTextInsteadOfTheRender(textNode, tracked, edit) ||
          showEditedTextInsteadOfTheSplit(textNode, tracked, edit))
      ) {
        continue;
      }
      textNode.data = tracked.original;
      texts.delete(textNode);
      if (tracked.match) released.push(tracked.match);
    }
    for (const [element, originals] of attrOriginals) {
      if (main.contains(element)) continue;
      restoreAttrs(element, originals);
      attrOriginals.delete(element);
      holders.delete(element);
      ownAttributeWrites.delete(element);
    }
    release(released);
    for (const listener of listeners) listener.onContentRemoved?.();
  };

  const isOwnWrite = (textNode: Text): boolean => {
    const tracked = texts.get(textNode);
    if (!tracked || tracked.ownWritesToObserve === 0) return false;
    tracked.ownWritesToObserve -= 1;
    return true;
  };

  const forgetUnlessEdited = (textNode: Text) => {
    if (isOwnWrite(textNode) || edits.has(textNode)) return;
    forget(textNode);
  };

  const forgetUnlessEditedOrOwnWrite = (textNode: Text) => {
    if (isOwnWrite(textNode)) return;
    const tracked = texts.get(textNode);
    const edit = edits.get(textNode);
    if (tracked && edit) showEditedTextAgain(textNode, tracked, edit);
    else forget(textNode);
  };

  const pipeline = createMutationPipeline(main, {
    isOwnAttributeWrite,
    onMarkedAttribute: recordAttr,
    onNodesRemoved: releaseDetachedNodes,
    onPlainTextWritten: forgetUnlessEdited,
    onRoots: (roots) => {
      for (const root of roots) scan(root);
    },
    onTextReset: forgetUnlessEditedOrOwnWrite,
  });

  scan(main);

  return {
    subscribe(listener) {
      listeners.add(listener);
      const onThePage = [...texts.values()].flatMap(({ match }) =>
        match && main.contains(match.textNode) ? [match] : []
      );
      listener.onFields(main, onThePage);
      return () => {
        listeners.delete(listener);
      };
    },
    showText(node, text) {
      const tracked = texts.get(node);
      if (!tracked || node.data === text || edits.has(node)) return;
      tracked.ownWritesToObserve += 1;
      node.data = text;
    },
    showTextInHolder(match, text) {
      const { holder } = match;
      const held = holder && holders.get(holder);
      if (!holder || !held || held.match !== match || edits.has(match.textNode)) return false;
      if (sharedHolders.has(holder)) return false;
      if (main.contains(match.textNode) || !main.contains(holder)) return false;
      showFieldInHolder(holder, held, text);
      return true;
    },
    joinSplitText(holder, mayJoin) {
      const held = holders.get(holder);
      if (!held || sharedHolders.has(holder) || edits.has(held.match.textNode)) return null;
      if (main.contains(held.match.textNode) || !main.contains(holder)) return null;
      const text = withoutMarker(held.original);
      if (!isSplitIntoPlainElements(holder, text) || !mayJoin(held.match)) return null;
      return showFieldInHolder(holder, held, text);
    },
    beginEdit(match, edit) {
      const { holder, textNode } = match;
      const isHeld = holder !== undefined && holders.get(holder)?.match === match;
      const editedElement = textNode.parentElement;
      if (!isHeld || !editedElement || texts.get(textNode)?.match !== match) return null;
      edits.set(textNode, {
        ...edit,
        ...whitespaceAround(textNode, editedElement),
        editedElement,
        nextSibling: textNode.nextSibling,
        present: new Set(editedElement.childNodes),
      });
      return editedElement;
    },
    endEdit(match, text) {
      const { holder, textNode } = match;
      const held = holder && holders.get(holder);
      const edit = edits.get(textNode);
      edits.delete(textNode);
      if (!edit || !holder || !held || !main.contains(edit.editedElement)) return;
      showOnlyEditedText(edit, textNode);
      const known = texts.get(textNode);
      const tracked = known ?? {
        match,
        nodeMarker: null,
        original: held.original,
        ownWritesToObserve: 0,
      };
      const shown = `${edit.before}${text}${edit.after}`;
      if (textNode.data !== shown) {
        tracked.ownWritesToObserve += 1;
        textNode.data = shown;
      }
      if (known) return;
      texts.set(textNode, tracked);
      holders.set(holder, { match, original: held.original });
      for (const listener of listeners) listener.onFields(holder, [match]);
    },
    whitespaceAround({ textNode }) {
      const editedElement = textNode.parentElement;
      return editedElement ? whitespaceAround(textNode, editedElement) : NO_WHITESPACE_AROUND;
    },
    isIdentifiedByThePage,
    namesUploadOf: (element) => attrOriginals.get(element)?.get(DATA_VE_VALUE_ID_ATTR) === null,
    dispose() {
      pipeline.dispose();
      listeners.clear();
      edits.clear();
      for (const [textNode, { original }] of texts) {
        if (textNode.isConnected) textNode.data = original;
      }
      for (const [element, originals] of attrOriginals) {
        if (element.isConnected) restoreAttrs(element, originals);
      }
    },
  };
}
