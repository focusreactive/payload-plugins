import { VE_IDENTITY_ATTRS } from "../../shared/protocol.js";
import { isOverlayLabel, STEGA_PREFILTER } from "./constants.js";

export type MutationPipelineCallbacks = {
  onRoots(roots: Element[]): void;
  onTextReset(node: Text): void;
  onPlainTextWritten(node: Text): void;
  onNodesRemoved(): void;
};

export interface MutationPipeline {
  dispose(): void;
}

const hasMarkerCharacters = (node: Text) => STEGA_PREFILTER.test(node.data);

const rescanRootOf = (added: Node): Element | null => {
  if (added instanceof Element) return isOverlayLabel(added) ? null : added;
  if (added instanceof Text && hasMarkerCharacters(added)) return added.parentElement;
  return null;
};

const removedPageContent = (mutation: MutationRecord) =>
  Array.from(mutation.removedNodes).some((removed) => !isOverlayLabel(removed));

const inDocumentOrder = (a: Element, b: Element) => {
  if (a === b) return 0;
  const pos = a.compareDocumentPosition(b);
  if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
};

const withoutNestedRoots = (roots: Element[]): Element[] => {
  const outermost: Element[] = [];
  for (const root of [...roots].sort(inDocumentOrder)) {
    const lastKept = outermost.at(-1);
    if (lastKept?.contains(root)) continue;
    outermost.push(root);
  }
  return outermost;
};

export function createMutationPipeline(
  root: Element,
  callbacks: MutationPipelineCallbacks
): MutationPipeline {
  const pending = new Set<Element>();
  let scheduled = false;
  let nodesRemoved = false;

  const flush = () => {
    scheduled = false;
    if (nodesRemoved) {
      nodesRemoved = false;
      callbacks.onNodesRemoved();
    }
    const connected: Element[] = [];
    for (const node of pending) {
      if (node.isConnected) connected.push(node);
    }
    pending.clear();
    if (connected.length === 0) return;

    callbacks.onRoots(withoutNestedRoots(connected));
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(flush);
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        if (removedPageContent(mutation)) nodesRemoved = true;
        for (const added of Array.from(mutation.addedNodes)) {
          const rescanRoot = rescanRootOf(added);
          if (rescanRoot) pending.add(rescanRoot);
        }
      } else if (mutation.type === "characterData") {
        const textNode = mutation.target;
        if (!(textNode instanceof Text)) continue;
        if (!hasMarkerCharacters(textNode)) {
          callbacks.onPlainTextWritten(textNode);
          continue;
        }
        callbacks.onTextReset(textNode);
        const parent = textNode.parentElement;
        if (parent) pending.add(parent);
      } else if (mutation.type === "attributes" && mutation.target instanceof Element) {
        pending.add(mutation.target);
      }
    }
    if (pending.size > 0 || nodesRemoved) schedule();
  });
  observer.observe(root, {
    attributeFilter: [...VE_IDENTITY_ATTRS],
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });

  return {
    dispose() {
      observer.disconnect();
      pending.clear();
      scheduled = false;
      nodesRemoved = false;
    },
  };
}
