import { hasMarker, withoutMarker } from "../../shared/stegaText.js";
import { withoutNestedRoots } from "./mutationPipeline.js";
import { isVisibleText, markedAttributesIn, visibleTextNodesIn } from "./pageNodes.js";

export interface MarkerCleaner {
  dispose(): void;
}

type CleanedValue = { original: string; cleaned: string };

const cleanedValueOf = (value: string): CleanedValue | null =>
  hasMarker(value) ? { cleaned: withoutMarker(value), original: value } : null;

const headOutside = (root: Element): Element[] => {
  const { head } = root.ownerDocument;
  return head && !root.contains(head) ? [head] : [];
};

function createMarkerCleaner(roots: readonly Element[]): MarkerCleaner {
  const texts = new Map<Text, CleanedValue>();
  const attrs = new Map<Element, Map<string, CleanedValue>>();

  const cleanText = (node: Text) => {
    const value = cleanedValueOf(node.data);
    if (!value || !isVisibleText(node)) return;
    texts.set(node, value);
    node.data = value.cleaned;
  };

  const cleanAttr = (element: Element, name: string) => {
    const value = cleanedValueOf(element.getAttribute(name) ?? "");
    if (!value) return;
    const cleanedOfElement = attrs.get(element) ?? new Map<string, CleanedValue>();
    cleanedOfElement.set(name, value);
    attrs.set(element, cleanedOfElement);
    element.setAttribute(name, value.cleaned);
  };

  const scan = (root: Element) => {
    for (const node of visibleTextNodesIn(root)) cleanText(node);
    for (const [element, { name }] of markedAttributesIn(root)) cleanAttr(element, name);
  };

  const forgetDetached = () => {
    for (const node of texts.keys()) {
      if (!node.isConnected) texts.delete(node);
    }
    for (const element of attrs.keys()) {
      if (!element.isConnected) attrs.delete(element);
    }
  };

  const observer = new MutationObserver((mutations) => {
    const added: Element[] = [];
    let isAnyRemoved = false;
    for (const { addedNodes, attributeName, removedNodes, target, type } of mutations) {
      if (type === "characterData" && target instanceof Text) cleanText(target);
      else if (type === "attributes" && attributeName && target instanceof Element) {
        cleanAttr(target, attributeName);
      } else if (type === "childList") {
        isAnyRemoved ||= removedNodes.length > 0;
        for (const node of Array.from(addedNodes)) {
          if (node instanceof Element) added.push(node);
          else if (node instanceof Text) cleanText(node);
        }
      }
    }
    if (isAnyRemoved) forgetDetached();
    const connected = added.filter((element) => element.isConnected);
    for (const root of withoutNestedRoots(connected)) scan(root);
  });

  for (const root of roots) {
    scan(root);
    observer.observe(root, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
  }

  return {
    dispose() {
      observer.disconnect();
      for (const [node, { cleaned, original }] of texts) {
        if (node.isConnected && node.data === cleaned) node.data = original;
      }
      for (const [element, cleanedOfElement] of attrs) {
        if (!element.isConnected) continue;
        for (const [name, { cleaned, original }] of cleanedOfElement) {
          if (element.getAttribute(name) === cleaned) element.setAttribute(name, original);
        }
      }
      texts.clear();
      attrs.clear();
    },
  };
}

export const cleanPageAround = (root: Element): MarkerCleaner =>
  createMarkerCleaner([root, ...headOutside(root)]);

export const cleanHeadOutside = (root: Element): MarkerCleaner =>
  createMarkerCleaner(headOutside(root));
