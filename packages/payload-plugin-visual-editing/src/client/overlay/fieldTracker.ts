import type { RichTextNodeMarker } from "../../shared/richText/nodeKey.js";
import type { VeIdentity } from "../../shared/shared.js";

import { vercelStegaDecode } from "@vercel/stega";

import { DATA_VE_LOCALE_ATTR, DATA_VE_PATH_ATTR } from "../../shared/protocol.js";
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

export type FieldMatch = VeIdentity & { textNode: Text; richText?: RichTextShape };

export type FieldListener = {
  onFields(root: Element, matches: readonly FieldMatch[]): void;
  onNodesReleased?(matches: readonly FieldMatch[]): void;
  onContentRemoved?(): void;
};

export interface FieldTracker {
  subscribe(listener: FieldListener): () => void;
  showText(node: Text, text: string): void;
  dispose(): void;
}

type TrackedText = {
  original: string;
  ownWritesToObserve: number;
  nodeMarker: RichTextNodeMarker | null;
  match: FieldMatch | null;
};

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

const restoreAttrs = (element: Element, originals: ReadonlyMap<string, string | null>) => {
  for (const [attr, value] of originals) {
    if (value === null) element.removeAttribute(attr);
    else element.setAttribute(attr, value);
  }
};

const identityAttrsOfImage = (element: Element, { name, value }: Attr) => {
  if (name !== IMAGE_DESCRIPTION_ATTR || element.hasAttribute(DATA_VE_PATH_ATTR)) return {};
  const field = fromStegaPayload(payloadIn(value));
  return field ? identityAttrsOf(field) : {};
};

export function createFieldTracker(main: HTMLElement): FieldTracker {
  const texts = new Map<Text, TrackedText>();
  const attrOriginals = new Map<Element, Map<string, string | null>>();
  const listeners = new Set<FieldListener>();

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

  const record = (textNode: Text): TrackedText | null => {
    const payload = payloadIn(textNode.data);
    const field = fromStegaPayload(payload);
    const nodeMarker = fromRichTextNodeMarker(payload);
    if (!field && !nodeMarker) return null;
    const tracked = {
      match: field && { ...field, textNode },
      original: textNode.data,
      ownWritesToObserve: 1,
      nodeMarker,
    };
    texts.set(textNode, tracked);
    textNode.data = withoutMarker(tracked.original);
    return tracked;
  };

  const recordAttr = (element: Element, attr: Attr) => {
    const { name, value } = attr;
    const originals = attrOriginals.get(element) ?? new Map<string, string | null>();
    if (originals.has(name)) return;
    const identity = identityAttrsOfImage(element, attr);
    originals.set(name, value);
    attrOriginals.set(element, originals);
    element.setAttribute(name, withoutMarker(value));
    for (const [identityAttr, identityValue] of Object.entries(identity)) {
      originals.set(identityAttr, null);
      element.setAttribute(identityAttr, identityValue);
    }
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
    }
    release(released);
    for (const listener of listeners) listener.onContentRemoved?.();
  };

  const forgetUnlessOwnWrite = (textNode: Text) => {
    const tracked = texts.get(textNode);
    if (tracked && tracked.ownWritesToObserve > 0) {
      tracked.ownWritesToObserve -= 1;
      return;
    }
    forget(textNode);
  };

  const pipeline = createMutationPipeline(main, {
    onNodesRemoved: releaseDetachedNodes,
    onPlainTextWritten: forgetUnlessOwnWrite,
    onRoots: (roots) => {
      for (const root of roots) scan(root);
    },
    onTextReset: forgetUnlessOwnWrite,
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
      if (!tracked || node.data === text) return;
      tracked.ownWritesToObserve += 1;
      node.data = text;
    },
    dispose() {
      pipeline.dispose();
      listeners.clear();
      for (const [textNode, { original }] of texts) {
        if (textNode.isConnected) textNode.data = original;
      }
      for (const [element, originals] of attrOriginals) {
        if (element.isConnected) restoreAttrs(element, originals);
      }
    },
  };
}
