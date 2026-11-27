import type { VeEditedField } from "../../shared/protocol.js";
import type { FieldMatch, FieldTracker } from "../overlay/fieldTracker.js";
import type { Point } from "./caret.js";
import type { FieldEdit } from "./editTransport.js";

import { holdsLineBreak, oneLineOf } from "../../shared/fieldEdit.js";
import { caretOffsetIn, placeCaret, placeCaretAtPoint, textNodesIn } from "./caret.js";
import { showEditingFrame } from "./editingFrame.js";

export const DATA_VE_EDITING_ATTR = "data-ve-editing";

export type TextEditingDeps = {
  tracker: FieldTracker;
  beginEdit(field: VeEditedField, startedFrom: string): FieldEdit<string>;
};

export interface TextEditing {
  begin(match: FieldMatch, field: VeEditedField, point: Point, caret?: number): boolean;
  isEditing(holder: Element): boolean;
  commit(): void;
  endIfRemoved(): void;
  dispose(): void;
}

type TypedText = (text: string) => string;

type EditedText = {
  editedElement: HTMLElement;
  kept: ReadonlySet<ChildNode>;
  before: string;
  after: string;
};

type Direction = "backward" | "forward";

type HistoryStep = "undo" | "redo";

type TextState = { text: string; caret: number };

type Edit = {
  match: FieldMatch;
  editedElement: HTMLElement;
  initialText: string;
  text: string;
  caret: number;
  saving: FieldEdit<string>;
  restored: ReadonlyMap<string, string | null>;
  kept: Set<ChildNode>;
  before: string;
  after: string;
  keptAside: ReadonlyMap<Element, string | null>;
  childrenBeforeDeletion: readonly ChildNode[];
  keptAfterTheText: readonly ChildNode[];
  history: readonly TextState[];
  historyAt: number;
  lastInputType: string | null;
  breakLinesAsThePageDid(): void;
  hideFrame(): void;
  breakLinesAsTyped(): void;
  stopListening(): void;
};

const EDITABLE_ATTR = "contenteditable";
const SPELLCHECK_ATTR = "spellcheck";
const PLAIN_TEXT_ONLY = "plaintext-only";
const RICH_TEXT = "true";
const SPELLCHECK_OFF = "false";
const NOT_EDITABLE = "false";
const IN_CAPTURE_PHASE = true;
const CANCEL_KEY = "Escape";
const COMMIT_KEY = "Enter";
const SPACE_KEY = " ";
const INSERT_TEXT_COMMAND = "insertText";
const PLAIN_TEXT_FORMAT = "text/plain";
const EDITING_ATTRS = [EDITABLE_ATTR, SPELLCHECK_ATTR, DATA_VE_EDITING_ATTR];
const LINE_BREAK_TAG = "BR";
const STYLE_ATTR = "style";
const LINE_BREAKING_PROPERTIES = ["overflow-wrap", "line-break"] as const;
const STYLE_ID = "ve-inline-editing-style";
const EDITING_STYLE = `[${DATA_VE_EDITING_ATTR}]{cursor:text !important;outline:none !important;pointer-events:auto !important}`;
const INSERT_TEXT_INPUT = "insertText";
const FIRST_INPUT_EVENT = "beforeinput";
const LINE_INPUTS: ReadonlySet<string> = new Set(["insertLineBreak", "insertParagraph"]);
const PARAGRAPH_INPUT = "insertParagraph";
const HISTORY_STEPS_OF_INPUTS: ReadonlyMap<string, HistoryStep> = new Map([
  ["historyUndo", "undo"],
  ["historyRedo", "redo"],
]);
const UNDO_KEY = "z";
const REDO_KEY = "y";
const RUNNING_INPUTS: ReadonlySet<string> = new Set([
  "insertText",
  "deleteContentBackward",
  "deleteContentForward",
]);
const REPLACING_INPUTS: ReadonlySet<string> = new Set(["insertText", "insertReplacementText"]);
const DELETION_INPUTS: ReadonlyMap<string, Direction> = new Map([
  ["deleteContentBackward", "backward"],
  ["deleteContentForward", "forward"],
  ["deleteWordBackward", "backward"],
  ["deleteWordForward", "forward"],
  ["deleteSoftLineBackward", "backward"],
  ["deleteSoftLineForward", "forward"],
  ["deleteHardLineBackward", "backward"],
  ["deleteHardLineForward", "forward"],
]);
const GRANULARITY_OF_DELETION: ReadonlyMap<string, string> = new Map([
  ["deleteWordBackward", "word"],
  ["deleteWordForward", "word"],
  ["deleteSoftLineBackward", "lineboundary"],
  ["deleteSoftLineForward", "lineboundary"],
  ["deleteHardLineBackward", "paragraphboundary"],
  ["deleteHardLineForward", "paragraphboundary"],
]);
const DELETION_KEYS: ReadonlyMap<string, Direction> = new Map([
  ["Backspace", "backward"],
  ["Delete", "forward"],
]);
const EVENTS_BEFORE_THE_FIRST_INPUT = [
  "keydown",
  "paste",
  "cut",
  "drop",
  "compositionstart",
] as const;

const takesPlainTextOnly = (doc: Document): boolean => {
  const probe = doc.createElement("div");
  try {
    probe.contentEditable = PLAIN_TEXT_ONLY;
    return true;
  } catch {
    return false;
  }
};

const textOfNode = (node: ChildNode): string => {
  if (node instanceof Element && node.tagName === LINE_BREAK_TAG) return "\n";
  if (node instanceof Element) return Array.from(node.childNodes).map(textOfNode).join("");
  return node.textContent ?? "";
};

const textOf = (element: Element): string =>
  Array.from(element.childNodes).map(textOfNode).join("");

const isOwnNode = (kept: ReadonlySet<ChildNode>, node: ChildNode): boolean =>
  !kept.has(node) &&
  (node instanceof Text || (node instanceof Element && node.tagName === LINE_BREAK_TAG));

const ownNodesOf = ({ editedElement, kept }: EditedText): ChildNode[] =>
  Array.from(editedElement.childNodes).filter((node) => isOwnNode(kept, node));

const sharesItsElement = ({ kept }: EditedText): boolean => kept.size > 0;

const textsOf = (edit: EditedText): Text[] =>
  sharesItsElement(edit)
    ? ownNodesOf(edit).filter((node): node is Text => node instanceof Text)
    : textNodesIn(edit.editedElement);

const withoutWhitespaceAround = (text: string, { after, before }: EditedText): string => {
  const start = text.startsWith(before) ? before.length : 0;
  const end = text.endsWith(after) ? text.length - after.length : text.length;
  return text.slice(start, Math.max(start, end));
};

const textOfEdit = (edit: EditedText): string =>
  sharesItsElement(edit)
    ? withoutWhitespaceAround(ownNodesOf(edit).map(textOfNode).join(""), edit)
    : textOf(edit.editedElement);

const keptBeside = (element: HTMLElement, textNode: Text): Set<ChildNode> =>
  new Set(
    element.childElementCount > 0
      ? Array.from(element.childNodes).filter((node) => node !== textNode)
      : []
  );

const keepAside = (kept: ReadonlySet<ChildNode>): ReadonlyMap<Element, string | null> => {
  const keptAside = new Map<Element, string | null>();
  for (const node of kept) {
    if (!(node instanceof Element)) continue;
    keptAside.set(node, node.getAttribute(EDITABLE_ATTR));
    node.setAttribute(EDITABLE_ATTR, NOT_EDITABLE);
  }
  return keptAside;
};

const rangeOf = (
  doc: Document,
  { endContainer, endOffset, startContainer, startOffset }: AbstractRange
): Range => {
  const range = doc.createRange();
  range.setStart(startContainer, startOffset);
  range.setEnd(endContainer, endOffset);
  return range;
};

const reachesBeyondTheText = (
  { editedElement, kept }: EditedText,
  range: AbstractRange
): boolean => {
  const reach = rangeOf(editedElement.ownerDocument, range);
  return Array.from(editedElement.childNodes).some(
    (node) => !isOwnNode(kept, node) && reach.intersectsNode(node)
  );
};

const lengthOf = (texts: readonly Text[]): number =>
  texts.reduce((length, textNode) => length + textNode.length, 0);

const pointAt = (texts: readonly Text[], offset: number): readonly [Text, number] | null => {
  let remaining = offset;
  for (const textNode of texts) {
    if (remaining <= textNode.length) return [textNode, remaining];
    remaining -= textNode.length;
  }
  return null;
};

const rangeOfText = (
  edit: EditedText,
  texts: readonly Text[],
  from: number,
  to: number
): Range | null => {
  const start = pointAt(texts, from);
  const end = pointAt(texts, to);
  if (!start || !end) return null;
  const range = edit.editedElement.ownerDocument.createRange();
  range.setStart(...start);
  range.setEnd(...end);
  return range;
};

const textRangeOf = (edit: EditedText): Range | null => {
  const texts = textsOf(edit);
  return rangeOfText(edit, texts, edit.before.length, lengthOf(texts) - edit.after.length);
};

const clampedTo = (text: Range, range: AbstractRange): Range => {
  const clamped = text.cloneRange();
  const startsAt = text.comparePoint(range.startContainer, range.startOffset);
  const endsAt = text.comparePoint(range.endContainer, range.endOffset);
  if (startsAt === 0) clamped.setStart(range.startContainer, range.startOffset);
  if (endsAt === 0) clamped.setEnd(range.endContainer, range.endOffset);
  if (startsAt > 0) clamped.collapse(false);
  if (endsAt < 0) clamped.collapse(true);
  return clamped;
};

const selectedRangeOf = ({ editedElement }: EditedText): Range | null => {
  const selection = editedElement.ownerDocument.getSelection();
  return selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
};

const isCaretAtTheEdge = (edit: EditedText, direction: Direction): boolean => {
  if (!selectedRangeOf(edit)?.collapsed) return false;
  const texts = textsOf(edit);
  const caret = caretOffsetIn(edit.editedElement, texts);
  if (caret === null) return false;
  return direction === "backward"
    ? caret <= edit.before.length
    : caret >= lengthOf(texts) - edit.after.length;
};

const reachesTheEdge = (text: Range, changed: Range): boolean =>
  changed.compareBoundaryPoints(Range.START_TO_START, text) <= 0 ||
  changed.compareBoundaryPoints(Range.END_TO_END, text) >= 0;

const select = ({ editedElement }: EditedText, range: Range): Document => {
  const doc = editedElement.ownerDocument;
  const selection = doc.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return doc;
};

const insertText = (doc: Document, text: string): void => {
  if (typeof doc.execCommand === "function") doc.execCommand(INSERT_TEXT_COMMAND, false, text);
};

const deleteFromTheText = (edit: EditedText, range: Range, inputType: string): void => {
  const { endContainer, endOffset, startContainer, startOffset } = range;
  const cuts = ownNodesOf(edit)
    .filter((node) => range.intersectsNode(node))
    .map((node) => {
      if (!(node instanceof Text)) return () => node.remove();
      const from = node === startContainer ? startOffset : 0;
      const to = node === endContainer ? endOffset : node.length;
      return () => node.deleteData(from, to - from);
    });
  for (const cut of cuts) cut();
  edit.editedElement.ownerDocument.getSelection()?.collapse(startContainer, startOffset);
  edit.editedElement.dispatchEvent(new InputEvent("input", { bubbles: true, inputType }));
};

const reachOfTheBrowser = (
  { editedElement }: EditedText,
  direction: Direction,
  granularity: string
): Range | null => {
  const selection = editedElement.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0 || typeof selection.modify !== "function") {
    return null;
  }
  const caret = selection.getRangeAt(0).cloneRange();
  selection.modify("extend", direction, granularity);
  const reach = selection.getRangeAt(0).cloneRange();
  selection.removeAllRanges();
  selection.addRange(caret);
  return reach;
};

const changedByDeletion = (
  edit: EditedText,
  direction: Direction,
  event: InputEvent,
  target?: AbstractRange
): AbstractRange | null => {
  if (target) return target;
  const selected = selectedRangeOf(edit);
  const granularity = GRANULARITY_OF_DELETION.get(event.inputType);
  if (!selected?.collapsed || !granularity) return selected;
  return reachOfTheBrowser(edit, direction, granularity) ?? selected;
};

const keepDeletionInTheText = (
  edit: EditedText,
  direction: Direction,
  event: InputEvent,
  target?: AbstractRange
): void => {
  if (!event.cancelable || event.isComposing) return;
  const text = textRangeOf(edit);
  const changed = changedByDeletion(edit, direction, event, target);
  if (!text || !changed) return;
  if (changed.collapsed) {
    if (isCaretAtTheEdge(edit, direction)) event.preventDefault();
    return;
  }
  if (!reachesTheEdge(text, rangeOf(edit.editedElement.ownerDocument, changed))) return;
  event.preventDefault();
  const deleted = clampedTo(text, changed);
  if (!deleted.collapsed) deleteFromTheText(edit, deleted, event.inputType);
};

const textOfInput = (event: InputEvent): string =>
  event.data ?? event.dataTransfer?.getData(PLAIN_TEXT_FORMAT) ?? "";

const keepInputInTheText = (edit: EditedText, event: InputEvent): void => {
  if (event.inputType === PARAGRAPH_INPUT) {
    event.preventDefault();
    return;
  }
  const [target] = event.getTargetRanges?.() ?? [];
  const direction = DELETION_INPUTS.get(event.inputType);
  if (direction) {
    keepDeletionInTheText(edit, direction, event, target);
    return;
  }
  const changed = target ?? selectedRangeOf(edit);
  const text = textRangeOf(edit);
  if (!changed || !text || !reachesBeyondTheText(edit, changed)) return;
  event.preventDefault();
  if (!REPLACING_INPUTS.has(event.inputType)) return;
  select(edit, clampedTo(text, changed));
  insertText(edit.editedElement.ownerDocument, textOfInput(event));
};

const POINT_AFTER_THE_RANGE = 1;

const isInTheText = (edit: EditedText, texts: readonly Text[], range: Range): boolean =>
  texts.includes(range.startContainer as Text) &&
  texts.includes(range.endContainer as Text) &&
  !reachesBeyondTheText(edit, range);

const isInside = (text: Range, range: Range): boolean =>
  range.compareBoundaryPoints(Range.START_TO_START, text) >= 0 &&
  range.compareBoundaryPoints(Range.END_TO_END, text) <= 0;

const keepSelectionInTheText = (edit: EditedText): void => {
  const selection = edit.editedElement.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const texts = textsOf(edit);
  const [first] = texts;
  const last = texts.at(-1);
  if (!first || !last || !edit.editedElement.contains(range.commonAncestorContainer)) return;
  if (range.collapsed) {
    if (isInTheText(edit, texts, range)) return;
    if (range.comparePoint(first, 0) === POINT_AFTER_THE_RANGE) selection.collapse(first, 0);
    else selection.collapse(last, last.length);
    return;
  }
  const text = textRangeOf(edit);
  if (!text || (isInTheText(edit, texts, range) && isInside(text, range))) return;
  const narrowed = clampedTo(text, range);
  selection.setBaseAndExtent(
    narrowed.startContainer,
    narrowed.startOffset,
    narrowed.endContainer,
    narrowed.endOffset
  );
};

const putBackWhatTheDeletionTook = (edit: Edit): void => {
  const { childrenBeforeDeletion, editedElement, kept } = edit;
  edit.childrenBeforeDeletion = [];
  for (const [index, node] of childrenBeforeDeletion.entries()) {
    if (!kept.has(node) || node.parentNode === editedElement) continue;
    const next = childrenBeforeDeletion
      .slice(index + 1)
      .find((later) => later.parentNode === editedElement);
    editedElement.insertBefore(node, next ?? null);
  }
};

const historyStepOfKey = (event: KeyboardEvent): HistoryStep | null => {
  if ((!event.metaKey && !event.ctrlKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === UNDO_KEY) return event.shiftKey ? "redo" : "undo";
  return key === REDO_KEY && event.ctrlKey ? "redo" : null;
};

const rememberTextState = (edit: Edit, inputType: string): void => {
  if (edit.history[edit.historyAt]?.text === edit.text) return;
  const continuesTheRun =
    edit.historyAt > 0 && inputType === edit.lastInputType && RUNNING_INPUTS.has(inputType);
  const kept = edit.history.slice(0, continuesTheRun ? edit.historyAt : edit.historyAt + 1);
  edit.history = [...kept, { caret: edit.caret, text: edit.text }];
  edit.historyAt = edit.history.length - 1;
  edit.lastInputType = inputType;
};

const placeOfTheText = ({ editedElement, keptAfterTheText }: Edit): ChildNode | null =>
  keptAfterTheText.find((node) => node.parentNode === editedElement) ?? null;

const showTextState = (edit: Edit, { caret, text }: TextState): void => {
  const [first, ...rest] = ownNodesOf(edit);
  const textNode = first instanceof Text ? first : edit.match.textNode;
  for (const node of first instanceof Text ? rest : ownNodesOf(edit)) node.remove();
  if (textNode.parentNode !== edit.editedElement) {
    edit.editedElement.insertBefore(textNode, placeOfTheText(edit));
  }
  textNode.data = `${edit.before}${text}${edit.after}`;
  placeCaret(edit.editedElement, edit.before.length + caret, [textNode]);
};

const textStartIn = ({ before }: EditedText, texts: readonly Text[]): number =>
  texts
    .map(({ data }) => data)
    .join("")
    .startsWith(before)
    ? before.length
    : 0;

const caretInTheText = (edit: Edit): number => {
  const texts = textsOf(edit);
  const caret = caretOffsetIn(edit.editedElement, texts);
  return caret === null ? edit.caret : Math.max(0, caret - textStartIn(edit, texts));
};

const placeCaretInTheText = (edit: Edit): void => {
  const texts = textsOf(edit);
  placeCaret(edit.editedElement, textStartIn(edit, texts) + edit.caret, texts);
};

const isInsideButton = (editedElement: Element): boolean =>
  editedElement.closest("button") !== null;

const keepLineBreaking = (element: HTMLElement): (() => void) => {
  const computed = element.ownerDocument.defaultView?.getComputedStyle(element);
  const kept = LINE_BREAKING_PROPERTIES.map((name) => ({
    inline: element.style.getPropertyValue(name),
    name,
    onThePage: computed?.getPropertyValue(name) ?? "",
    priority: element.style.getPropertyPriority(name),
  }));
  for (const { name, onThePage } of kept) {
    if (onThePage) element.style.setProperty(name, onThePage);
  }
  return () => {
    for (const { inline, name, priority } of kept)
      element.style.setProperty(name, inline, priority);
    if (element.getAttribute(STYLE_ATTR) === "") element.removeAttribute(STYLE_ATTR);
  };
};

const isOneLine = (match: FieldMatch): boolean => match.multiline !== true;

const typedTextOf = (match: FieldMatch): TypedText =>
  isOneLine(match) ? oneLineOf : (text) => text;

const selectTargetOf = (event: InputEvent, doc: Document): void => {
  const [target] = event.getTargetRanges?.() ?? [];
  const selection = doc.getSelection();
  if (!target || !selection) return;
  const range = doc.createRange();
  range.setStart(target.startContainer, target.startOffset);
  range.setEnd(target.endContainer, target.endOffset);
  selection.removeAllRanges();
  selection.addRange(range);
};

const keepOneLine = (event: InputEvent): void => {
  if (event.defaultPrevented || !(event.target instanceof HTMLElement)) return;
  if (LINE_INPUTS.has(event.inputType)) {
    event.preventDefault();
    return;
  }
  const text = textOfInput(event);
  if (!holdsLineBreak(text)) return;
  event.preventDefault();
  const doc = event.target.ownerDocument;
  selectTargetOf(event, doc);
  insertText(doc, oneLineOf(text));
};

const keepLinesUntilTheFirstChange = (element: HTMLElement, typedText: TypedText): (() => void) => {
  const firstChange = new AbortController();
  const untilTheFirstChange = { signal: firstChange.signal };
  const breakLinesAsTyped = () => {
    if (firstChange.signal.aborted) return;
    firstChange.abort();
    if (element.hasAttribute(EDITABLE_ATTR)) element.setAttribute(EDITABLE_ATTR, PLAIN_TEXT_ONLY);
  };
  const typeOnceLinesBreak = (event: InputEvent) => {
    breakLinesAsTyped();
    if (event.defaultPrevented) return;
    if (event.inputType !== INSERT_TEXT_INPUT || typeof event.data !== "string") return;
    event.preventDefault();
    insertText(element.ownerDocument, typedText(event.data));
  };
  for (const name of EVENTS_BEFORE_THE_FIRST_INPUT)
    element.addEventListener(name, breakLinesAsTyped, untilTheFirstChange);
  element.addEventListener(FIRST_INPUT_EVENT, typeOnceLinesBreak, untilTheFirstChange);
  return breakLinesAsTyped;
};

export const addEditingStyle = (doc: Document): void => {
  if (doc.querySelector(`#${STYLE_ID}`)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = EDITING_STYLE;
  doc.head.append(style);
};

const setAttributes = (
  element: HTMLElement,
  attributes: ReadonlyMap<string, string | null>
): void => {
  for (const [name, value] of attributes) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
};

export function createTextEditing({ beginEdit, tracker }: TextEditingDeps): TextEditing {
  let editing: Edit | null = null;

  const end = (text: string, isTakenBack: boolean) => {
    const ended = editing;
    if (!ended) return;
    editing = null;
    ended.stopListening();
    ended.hideFrame();
    ended.breakLinesAsTyped();
    setAttributes(ended.editedElement, ended.restored);
    for (const [element, editable] of ended.keptAside) {
      if (editable === null) element.removeAttribute(EDITABLE_ATTR);
      else element.setAttribute(EDITABLE_ATTR, editable);
    }
    ended.breakLinesAsThePageDid();
    tracker.endEdit(ended.match, text);
    if (isTakenBack) ended.saving.cancel();
    else ended.saving.end();
    if (ended.editedElement.ownerDocument.activeElement === ended.editedElement)
      ended.editedElement.blur();
  };

  const commit = () => {
    if (editing) end(editing.text, false);
  };

  const cancel = () => {
    if (editing) end(editing.initialText, true);
  };

  const followTyping = (edit: Edit, inputType: string) => {
    putBackWhatTheDeletionTook(edit);
    edit.text = textOfEdit(edit);
    edit.caret = caretInTheText(edit);
    rememberTextState(edit, inputType);
    edit.saving.change(edit.text);
  };

  const stepThroughHistory = (edit: Edit, step: HistoryStep) => {
    const at = edit.historyAt + (step === "undo" ? -1 : 1);
    const state = edit.history[at];
    edit.lastInputType = null;
    if (!state) return;
    edit.historyAt = at;
    showTextState(edit, state);
    edit.text = state.text;
    edit.caret = state.caret;
    edit.saving.change(edit.text);
  };

  const followCaret = (edit: Edit) => {
    if (sharesItsElement(edit)) keepSelectionInTheText(edit);
    edit.caret = caretInTheText(edit);
  };

  const handleKey = (edit: Edit, isPlainTextOnly: boolean, event: KeyboardEvent) => {
    if (event.isComposing) return;
    const direction = DELETION_KEYS.get(event.key);
    const historyStep = sharesItsElement(edit) ? historyStepOfKey(event) : null;
    if (historyStep) {
      event.preventDefault();
      stepThroughHistory(edit, historyStep);
    } else if (event.key === CANCEL_KEY) {
      event.preventDefault();
      cancel();
    } else if (
      event.key === COMMIT_KEY &&
      (!event.shiftKey || !isPlainTextOnly || isOneLine(edit.match))
    ) {
      event.preventDefault();
      commit();
    } else if (event.key === SPACE_KEY && isInsideButton(edit.editedElement)) {
      event.preventDefault();
      insertText(edit.editedElement.ownerDocument, SPACE_KEY);
    } else if (direction && sharesItsElement(edit) && isCaretAtTheEdge(edit, direction)) {
      event.preventDefault();
    }
  };

  const pastePlainText = (edit: Edit, event: ClipboardEvent) => {
    event.preventDefault();
    insertText(
      edit.editedElement.ownerDocument,
      typedTextOf(edit.match)(event.clipboardData?.getData(PLAIN_TEXT_FORMAT) ?? "")
    );
  };

  const listen = (edit: Edit, isPlainTextOnly: boolean): (() => void) => {
    const { editedElement } = edit;
    const doc = editedElement.ownerDocument;
    const onInput = (event: Event) =>
      followTyping(edit, event instanceof InputEvent ? event.inputType : "");
    const onKey = (event: KeyboardEvent) => handleKey(edit, isPlainTextOnly, event);
    const onPaste = (event: ClipboardEvent) => pastePlainText(edit, event);
    const onSelection = () => followCaret(edit);
    const onBeforeInput = (event: InputEvent) => {
      if (!sharesItsElement(edit)) return;
      const historyStep = HISTORY_STEPS_OF_INPUTS.get(event.inputType);
      if (historyStep) {
        event.preventDefault();
        stepThroughHistory(edit, historyStep);
        return;
      }
      keepInputInTheText(edit, event);
      if (!event.defaultPrevented && DELETION_INPUTS.has(event.inputType)) {
        edit.childrenBeforeDeletion = Array.from(editedElement.childNodes);
      }
    };
    editedElement.addEventListener(FIRST_INPUT_EVENT, onBeforeInput, IN_CAPTURE_PHASE);
    editedElement.addEventListener("input", onInput);
    editedElement.addEventListener("keydown", onKey);
    editedElement.addEventListener("blur", commit);
    if (!isPlainTextOnly || isOneLine(edit.match)) editedElement.addEventListener("paste", onPaste);
    if (isOneLine(edit.match)) editedElement.addEventListener(FIRST_INPUT_EVENT, keepOneLine);
    doc.addEventListener("selectionchange", onSelection);
    return () => {
      editedElement.removeEventListener("input", onInput);
      editedElement.removeEventListener("keydown", onKey);
      editedElement.removeEventListener("blur", commit);
      editedElement.removeEventListener("paste", onPaste);
      editedElement.removeEventListener(FIRST_INPUT_EVENT, keepOneLine);
      editedElement.removeEventListener(FIRST_INPUT_EVENT, onBeforeInput, IN_CAPTURE_PHASE);
      doc.removeEventListener("selectionchange", onSelection);
    };
  };

  return {
    begin(match, field, point, caret) {
      if (editing?.match === match) return true;
      commit();

      const editedElement = tracker.beginEdit(match, {
        onSetAside: (nodes) => {
          for (const node of nodes) editing?.kept.add(node);
        },
        onShownAgain: () => {
          if (editing) placeCaretInTheText(editing);
        },
        shownText: () => editing?.text ?? "",
      });
      if (!editedElement) return false;

      const doc = editedElement.ownerDocument;
      const isPlainTextOnly = takesPlainTextOnly(doc);
      const kept = keptBeside(editedElement, match.textNode);
      const { after, before } = tracker.whitespaceAround(match);
      const text = textOfEdit({ after, before, editedElement, kept });
      const edit: Edit = {
        after,
        before,
        caret: text.length,
        childrenBeforeDeletion: [],
        history: [],
        historyAt: 0,
        keptAfterTheText: [...kept].filter(
          (node) =>
            (match.textNode.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
        ),
        lastInputType: null,
        breakLinesAsThePageDid: keepLineBreaking(editedElement),
        breakLinesAsTyped: () => undefined,
        editedElement,
        hideFrame: () => undefined,
        initialText: text,
        kept,
        keptAside: keepAside(kept),
        match,
        restored: new Map(EDITING_ATTRS.map((name) => [name, editedElement.getAttribute(name)])),
        saving: beginEdit(field, text),
        stopListening: () => undefined,
        text,
      };
      addEditingStyle(doc);
      editedElement.setAttribute(EDITABLE_ATTR, RICH_TEXT);
      if (isPlainTextOnly) {
        edit.breakLinesAsTyped = keepLinesUntilTheFirstChange(editedElement, typedTextOf(match));
      }
      editedElement.setAttribute(SPELLCHECK_ATTR, SPELLCHECK_OFF);
      editedElement.setAttribute(DATA_VE_EDITING_ATTR, "");
      edit.stopListening = listen(edit, isPlainTextOnly);
      edit.hideFrame = showEditingFrame(editedElement);
      editing = edit;
      editedElement.focus();
      if (caret === undefined) placeCaretAtPoint(editedElement, point, textsOf(edit));
      else placeCaret(editedElement, caret, textsOf(edit));
      followCaret(edit);
      edit.history = [{ caret: edit.caret, text }];
      return true;
    },
    commit,
    dispose() {
      commit();
    },
    endIfRemoved() {
      if (editing && !editing.editedElement.isConnected) commit();
    },
    isEditing: (holder) => editing?.match.holder === holder,
  };
}
