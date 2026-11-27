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
  begin(match: FieldMatch, field: VeEditedField, point: Point): boolean;
  isEditing(holder: Element): boolean;
  commit(): void;
  endIfRemoved(): void;
  dispose(): void;
}

type TypedText = (text: string) => string;

type EditedText = { editedElement: HTMLElement; kept: ReadonlySet<ChildNode> };

type Edit = {
  match: FieldMatch;
  editedElement: HTMLElement;
  initialText: string;
  text: string;
  caret: number;
  saving: FieldEdit<string>;
  restored: ReadonlyMap<string, string | null>;
  kept: ReadonlySet<ChildNode>;
  keptAside: ReadonlyMap<Element, string | null>;
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

const textOfEdit = (edit: EditedText): string =>
  sharesItsElement(edit)
    ? ownNodesOf(edit).map(textOfNode).join("").trim()
    : textOf(edit.editedElement);

const keptBeside = (element: HTMLElement, textNode: Text): ReadonlySet<ChildNode> =>
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

const reachesBeyondTheText = (
  { editedElement, kept }: EditedText,
  range: AbstractRange
): boolean => {
  const reach = editedElement.ownerDocument.createRange();
  reach.setStart(range.startContainer, range.startOffset);
  reach.setEnd(range.endContainer, range.endOffset);
  return Array.from(editedElement.childNodes).some(
    (node) => !isOwnNode(kept, node) && reach.intersectsNode(node)
  );
};

const keepInputInTheText = (edit: EditedText, event: InputEvent): void => {
  const ranges = event.getTargetRanges?.() ?? [];
  if (ranges.some((range) => reachesBeyondTheText(edit, range))) event.preventDefault();
};

const POINT_AFTER_THE_RANGE = 1;

const isInTheText = (edit: EditedText, texts: readonly Text[], range: Range): boolean =>
  texts.includes(range.startContainer as Text) &&
  texts.includes(range.endContainer as Text) &&
  !reachesBeyondTheText(edit, range);

const keepSelectionInTheText = (edit: EditedText): void => {
  const selection = edit.editedElement.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const texts = textsOf(edit);
  const [first] = texts;
  const last = texts.at(-1);
  if (!first || !last || !edit.editedElement.contains(range.commonAncestorContainer)) return;
  if (isInTheText(edit, texts, range)) return;
  if (!range.collapsed) selection.setBaseAndExtent(first, 0, last, last.length);
  else if (range.comparePoint(first, 0) === POINT_AFTER_THE_RANGE) selection.collapse(first, 0);
  else selection.collapse(last, last.length);
};

const insertText = (doc: Document, text: string): void => {
  if (typeof doc.execCommand === "function") doc.execCommand(INSERT_TEXT_COMMAND, false, text);
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

const textOfInput = (event: InputEvent): string =>
  event.data ?? event.dataTransfer?.getData(PLAIN_TEXT_FORMAT) ?? "";

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

  const followTyping = (edit: Edit) => {
    edit.text = textOfEdit(edit);
    edit.caret = caretOffsetIn(edit.editedElement, textsOf(edit)) ?? edit.caret;
    edit.saving.change(edit.text);
  };

  const followCaret = (edit: Edit) => {
    if (sharesItsElement(edit)) keepSelectionInTheText(edit);
    edit.caret = caretOffsetIn(edit.editedElement, textsOf(edit)) ?? edit.caret;
  };

  const handleKey = (edit: Edit, isPlainTextOnly: boolean, event: KeyboardEvent) => {
    if (event.isComposing) return;
    if (event.key === CANCEL_KEY) {
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
    const onInput = () => followTyping(edit);
    const onKey = (event: KeyboardEvent) => handleKey(edit, isPlainTextOnly, event);
    const onPaste = (event: ClipboardEvent) => pastePlainText(edit, event);
    const onSelection = () => followCaret(edit);
    const onBeforeInput = (event: InputEvent) => keepInputInTheText(edit, event);
    if (sharesItsElement(edit))
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
    begin(match, field, point) {
      if (editing?.match === match) return true;
      commit();

      const editedElement = tracker.beginEdit(match, {
        onShownAgain: () => {
          if (editing) placeCaret(editing.editedElement, editing.caret, textsOf(editing));
        },
        shownText: () => editing?.text ?? "",
      });
      if (!editedElement) return false;

      const doc = editedElement.ownerDocument;
      const isPlainTextOnly = takesPlainTextOnly(doc);
      const kept = keptBeside(editedElement, match.textNode);
      const text = textOfEdit({ editedElement, kept });
      const edit: Edit = {
        caret: text.length,
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
      placeCaretAtPoint(editedElement, point, textsOf(edit));
      followCaret(edit);
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
