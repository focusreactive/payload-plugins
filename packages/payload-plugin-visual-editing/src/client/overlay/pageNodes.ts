import { hasMarker } from "../../shared/stegaText.js";

const SKIP_TEXT_PARENT_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

export const isVisibleText = (node: Text): boolean => {
  const parent = node.parentElement;
  return !parent || !SKIP_TEXT_PARENT_TAGS.has(parent.tagName);
};

export function* visibleTextNodesIn(root: Element): Generator<Text> {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      isVisibleText(node as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) yield node as Text;
}

function* elementsFrom(root: Element): Generator<Element> {
  yield root;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) yield node as Element;
}

export function* markedAttributesIn(root: Element): Generator<[Element, Attr]> {
  for (const element of elementsFrom(root)) {
    for (const attr of Array.from(element.attributes)) {
      if (hasMarker(attr.value)) yield [element, attr];
    }
  }
}
