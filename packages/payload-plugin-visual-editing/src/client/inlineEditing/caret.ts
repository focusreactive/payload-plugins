export type Point = { x: number; y: number };

type CaretPosition = { offset: number; offsetNode: Node };

type DocumentWithCaretFromPoint = Document & {
  caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

const textNodesIn = (element: Element): Text[] => {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  return textNodes;
};

export const caretOffsetIn = (element: Element): number | null => {
  const selection = element.ownerDocument.getSelection();
  const focusNode = selection?.focusNode;
  if (!selection || !focusNode || !element.contains(focusNode)) return null;
  const textBeforeCaret = element.ownerDocument.createRange();
  textBeforeCaret.selectNodeContents(element);
  textBeforeCaret.setEnd(focusNode, selection.focusOffset);
  return textBeforeCaret.toString().length;
};

export const placeCaret = (element: Element, offset: number): void => {
  const selection = element.ownerDocument.getSelection();
  if (!selection) return;
  let remaining = offset;
  const textNodes = textNodesIn(element);
  for (const textNode of textNodes) {
    if (remaining <= textNode.length) {
      selection.collapse(textNode, remaining);
      return;
    }
    remaining -= textNode.length;
  }
  const last = textNodes.at(-1);
  if (last) selection.collapse(last, last.length);
  else selection.collapse(element, 0);
};

const caretAtPoint = (doc: DocumentWithCaretFromPoint, { x, y }: Point): CaretPosition | null => {
  const position = doc.caretPositionFromPoint?.(x, y);
  if (position) return position;
  const range = doc.caretRangeFromPoint?.(x, y);
  return range ? { offset: range.startOffset, offsetNode: range.startContainer } : null;
};

export const placeCaretAtPoint = (element: Element, point: Point): void => {
  const caret = caretAtPoint(element.ownerDocument, point);
  const selection = element.ownerDocument.getSelection();
  if (caret && selection && element.contains(caret.offsetNode)) {
    selection.collapse(caret.offsetNode, caret.offset);
    return;
  }
  placeCaret(element, element.textContent?.length ?? 0);
};
