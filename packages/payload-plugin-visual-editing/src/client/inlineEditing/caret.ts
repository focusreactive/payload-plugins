export type Point = { x: number; y: number };

export type TextPosition = { offset: number; isAtStart: boolean };

type CaretPosition = { offset: number; offsetNode: Node };

type TextRect = { textNode: Text; rect: DOMRect };

const RECT_INSET_PX = 1;

type DocumentWithCaretFromPoint = Document & {
  caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

export const textNodesIn = (element: Element): Text[] => {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  return textNodes;
};

export const caretOffsetIn = (
  element: Element,
  texts: readonly Text[] = textNodesIn(element)
): number | null => {
  const selection = element.ownerDocument.getSelection();
  const focusNode = selection?.focusNode;
  if (!selection || !focusNode || !element.contains(focusNode)) return null;
  const textBeforeCaret = element.ownerDocument.createRange();
  textBeforeCaret.selectNodeContents(element);
  textBeforeCaret.setEnd(focusNode, selection.focusOffset);
  return texts
    .filter((textNode) => textBeforeCaret.intersectsNode(textNode))
    .reduce(
      (offset, textNode) =>
        offset + (textNode === focusNode ? selection.focusOffset : textNode.length),
      0
    );
};

export const placeCaret = (
  element: Element,
  offset: number,
  texts: readonly Text[] = textNodesIn(element)
): void => {
  const selection = element.ownerDocument.getSelection();
  if (!selection) return;
  let remaining = offset;
  for (const textNode of texts) {
    if (remaining <= textNode.length) {
      selection.collapse(textNode, remaining);
      return;
    }
    remaining -= textNode.length;
  }
  const last = texts.at(-1);
  if (last) selection.collapse(last, last.length);
  else selection.collapse(element, 0);
};

const caretAtPoint = (doc: DocumentWithCaretFromPoint, { x, y }: Point): CaretPosition | null => {
  const position = doc.caretPositionFromPoint?.(x, y);
  if (position) return position;
  const range = doc.caretRangeFromPoint?.(x, y);
  return range ? { offset: range.startOffset, offsetNode: range.startContainer } : null;
};

const positionIn = (texts: readonly Text[], textNode: Text, offset: number): TextPosition => {
  const before = texts
    .slice(0, texts.indexOf(textNode))
    .reduce((length, text) => length + text.length, 0);
  return { isAtStart: offset === 0, offset: before + offset };
};

const rectsOf = (textNode: Text): TextRect[] => {
  const range = textNode.ownerDocument.createRange();
  range.selectNodeContents(textNode);
  if (typeof range.getClientRects !== "function") return [];
  return [...range.getClientRects()].map((rect) => ({ rect, textNode }));
};

const within = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));

const pointIn = ({ bottom, left, right, top }: DOMRect, { x, y }: Point): Point => ({
  x: within(x, left, right),
  y: within(y, top + RECT_INSET_PX, bottom - RECT_INSET_PX),
});

const distanceTo = (rect: DOMRect, point: Point): number => {
  const nearest = pointIn(rect, point);
  return Math.hypot(nearest.x - point.x, nearest.y - point.y);
};

const nearestTextRect = (texts: readonly Text[], point: Point): TextRect | null => {
  let nearest: TextRect | null = null;
  for (const candidate of texts.flatMap(rectsOf)) {
    if (!nearest || distanceTo(candidate.rect, point) < distanceTo(nearest.rect, point)) {
      nearest = candidate;
    }
  }
  return nearest;
};

export const textPositionAtPoint = (
  doc: Document,
  texts: readonly Text[],
  point: Point
): TextPosition | null => {
  const hit = caretAtPoint(doc, point);
  if (hit && texts.includes(hit.offsetNode as Text)) {
    return positionIn(texts, hit.offsetNode as Text, hit.offset);
  }
  const nearest = nearestTextRect(texts, point);
  if (!nearest) return null;
  const { rect, textNode } = nearest;
  const nearby = caretAtPoint(doc, pointIn(rect, point));
  if (nearby?.offsetNode === textNode) return positionIn(texts, textNode, nearby.offset);
  const isBeforeTheText = point.y < rect.top || (point.y <= rect.bottom && point.x < rect.left);
  return positionIn(texts, textNode, isBeforeTheText ? 0 : textNode.length);
};

const WHITESPACE = /\s/u;

const isLetter = (character: string): boolean => !WHITESPACE.test(character);

export const offsetOfTheSameText = (textBefore: string, text: string): number => {
  let letters = [...textBefore].filter(isLetter).length;
  let offset = 0;
  for (const character of text) {
    if (letters === 0) break;
    if (isLetter(character)) letters -= 1;
    offset += character.length;
  }
  if (isLetter(textBefore.at(-1) ?? "")) return offset;
  while (offset < text.length && !isLetter(text.charAt(offset))) offset += 1;
  return offset;
};

export const placeCaretAtPoint = (
  element: Element,
  point: Point,
  texts: readonly Text[] = textNodesIn(element)
): void => {
  const caret = caretAtPoint(element.ownerDocument, point);
  const selection = element.ownerDocument.getSelection();
  if (caret && selection && texts.includes(caret.offsetNode as Text)) {
    selection.collapse(caret.offsetNode, caret.offset);
    return;
  }
  placeCaret(
    element,
    texts.reduce((length, textNode) => length + textNode.length, 0),
    texts
  );
};
