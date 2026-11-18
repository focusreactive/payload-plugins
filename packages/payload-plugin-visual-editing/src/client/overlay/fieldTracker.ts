import type { RichTextNodeMarker } from "../../shared/richText/nodeKey.js";
import type { VeIdentity } from "../../shared/shared.js";

import { vercelStegaDecode } from "@vercel/stega";

import {
  DATA_VE_LOCALE_ATTR,
  DATA_VE_PATH_ATTR,
  VE_IDENTITY_ATTRS,
} from "../../shared/protocol.js";
import { fieldKeyOfMarker } from "../../shared/fieldKey.js";
import { fromRichTextNodeMarker, richTextNodeKeyOf } from "../../shared/richText/nodeKey.js";
import { fromStegaPayload } from "../../shared/shared.js";
import { hasMarker, withoutMarker } from "../../shared/stegaText.js";
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

export interface FieldTracker {
  subscribe(listener: FieldListener): () => void;
  showText(node: Text, text: string): void;
  showTextInHolder(match: FieldMatch, text: string): boolean;
  beginEdit(match: FieldMatch, edit: FieldEdit): HTMLElement | null;
  endEdit(match: FieldMatch, text: string): void;
  isIdentifiedByThePage(element: Element): boolean;
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

const IMAGE_DESCRIPTION_ATTR = "alt";

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
  return field ? identityAttrsOf(field) : {};
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

const showOnlyEditedText = (editedElement: Element, textNode: Text): void => {
  for (const child of Array.from(editedElement.childNodes)) {
    if (child !== textNode && isLeftByAnEdit(child)) child.remove();
  }
  if (textNode.parentNode !== editedElement) editedElement.prepend(textNode);
};

const holderCandidateOf = (textNode: Text): Element | null => {
  const parent = textNode.parentElement;
  return parent?.closest(CLICKABLE) ?? parent;
};

const showsOnlyText = (element: Element, text: string) =>
  withoutMarker(element.textContent ?? "") === text;

export function createFieldTracker(main: HTMLElement): FieldTracker {
  const texts = new Map<Text, TrackedText>();
  const attrOriginals = new Map<Element, Map<string, string | null>>();
  const holders = new Map<Element, HeldField>();
  const ownAttributeWrites = new Map<Element, number>();
  const listeners = new Set<FieldListener>();
  const edits = new Map<Text, FieldEdit & { editedElement: HTMLElement }>();

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

  const identifyImage = (
    element: Element,
    originals: Map<string, string | null>,
    value: string
  ) => {
    const isIdentifiedHere = originals.get(DATA_VE_PATH_ATTR) === null && !holders.has(element);
    if (!isIdentifiedHere && element.hasAttribute(DATA_VE_PATH_ATTR)) return;
    const identity = identityOfDescription(value);
    for (const attr of VE_IDENTITY_ATTRS) {
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

  const releaseDetachedNodes = () => {
    const released: FieldMatch[] = [];
    for (const [textNode, tracked] of texts) {
      if (main.contains(textNode)) continue;
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

  const showEditedTextAgain = (textNode: Text, tracked: TrackedText, edit: FieldEdit) => {
    tracked.original = textNode.data;
    const holder = tracked.match?.holder;
    if (holder && tracked.match)
      holders.set(holder, { match: tracked.match, original: textNode.data });
    tracked.ownWritesToObserve += 1;
    textNode.data = edit.shownText();
    edit.onShownAgain();
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
      const { holder, textNode: _textNode, ...field } = match;
      const held = holder && holders.get(holder);
      if (!holder || !held || held.match !== match || edits.has(match.textNode)) return false;
      if (main.contains(match.textNode) || !main.contains(holder)) return false;
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
      return true;
    },
    beginEdit(match, edit) {
      const { holder, textNode } = match;
      const isHeld = holder !== undefined && holders.get(holder)?.match === match;
      const editedElement = textNode.parentElement;
      if (!isHeld || !editedElement || texts.get(textNode)?.match !== match) return null;
      if (editedElement.childElementCount > 0) return null;
      edits.set(textNode, { ...edit, editedElement });
      return editedElement;
    },
    endEdit(match, text) {
      const { holder, textNode } = match;
      const held = holder && holders.get(holder);
      const edit = edits.get(textNode);
      edits.delete(textNode);
      if (!edit || !holder || !held || !main.contains(edit.editedElement)) return;
      showOnlyEditedText(edit.editedElement, textNode);
      const known = texts.get(textNode);
      const tracked = known ?? {
        match,
        nodeMarker: null,
        original: held.original,
        ownWritesToObserve: 0,
      };
      if (textNode.data !== text) {
        tracked.ownWritesToObserve += 1;
        textNode.data = text;
      }
      if (known) return;
      texts.set(textNode, tracked);
      holders.set(holder, { match, original: held.original });
      for (const listener of listeners) listener.onFields(holder, [match]);
    },
    isIdentifiedByThePage(element) {
      const isWrittenHere = attrOriginals.get(element)?.get(DATA_VE_PATH_ATTR) === null;
      return element.hasAttribute(DATA_VE_PATH_ATTR) && !isWrittenHere;
    },
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
