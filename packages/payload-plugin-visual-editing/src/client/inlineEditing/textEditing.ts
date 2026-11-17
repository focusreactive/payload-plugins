import type { FieldMatch, FieldTracker } from "../overlay/fieldTracker.js";
import type { Point } from "./caret.js";

import { ACCENT_VAR, DEFAULT_ACCENT } from "../overlay/constants.js";
import { caretOffsetIn, placeCaret, placeCaretAtPoint } from "./caret.js";

export const DATA_VE_EDITING_ATTR = "data-ve-editing";

export type TextEditingDeps = {
  tracker: FieldTracker;
  send(match: FieldMatch, text: string): void;
  flush(): void;
};

export interface TextEditing {
  begin(match: FieldMatch, point: Point): boolean;
  isEditing(holder: Element): boolean;
  commit(): void;
  endIfRemoved(): void;
  dispose(): void;
}

type Edit = {
  match: FieldMatch;
  editedElement: HTMLElement;
  initialText: string;
  text: string;
  caret: number;
  wasSent: boolean;
  restored: ReadonlyMap<string, string | null>;
  stopListening(): void;
};

const EDITABLE_ATTR = "contenteditable";
const SPELLCHECK_ATTR = "spellcheck";
const PLAIN_TEXT_ONLY = "plaintext-only";
const RICH_TEXT = "true";
const SPELLCHECK_OFF = "false";
const CANCEL_KEY = "Escape";
const COMMIT_KEY = "Enter";
const SPACE_KEY = " ";
const INSERT_TEXT_COMMAND = "insertText";
const PLAIN_TEXT_FORMAT = "text/plain";
const EDITING_ATTRS = [EDITABLE_ATTR, SPELLCHECK_ATTR, DATA_VE_EDITING_ATTR];
const LINE_BREAK_TAG = "BR";
const STYLE_ID = "ve-inline-editing-style";
const EDITING_STYLE = `[${DATA_VE_EDITING_ATTR}]{cursor:text !important}[${DATA_VE_EDITING_ATTR}]:not(:hover){outline:2px solid var(${ACCENT_VAR}, ${DEFAULT_ACCENT}) !important;outline-offset:2px !important}`;

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

const insertText = (doc: Document, text: string): void => {
  if (typeof doc.execCommand === "function") doc.execCommand(INSERT_TEXT_COMMAND, false, text);
};

const isInsideButton = (editedElement: Element): boolean =>
  editedElement.closest("button") !== null;

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

export function createTextEditing({ flush, send, tracker }: TextEditingDeps): TextEditing {
  let editing: Edit | null = null;

  const end = (text: string) => {
    const ended = editing;
    if (!ended) return;
    editing = null;
    ended.stopListening();
    setAttributes(ended.editedElement, ended.restored);
    tracker.endEdit(ended.match, text);
    flush();
    if (ended.editedElement.ownerDocument.activeElement === ended.editedElement)
      ended.editedElement.blur();
  };

  const commit = () => {
    if (editing) end(editing.text);
  };

  const cancel = () => {
    if (!editing) return;
    if (editing.wasSent) send(editing.match, editing.initialText);
    end(editing.initialText);
  };

  const followTyping = (edit: Edit) => {
    edit.text = textOf(edit.editedElement);
    edit.caret = caretOffsetIn(edit.editedElement) ?? edit.caret;
    edit.wasSent = true;
    send(edit.match, edit.text);
  };

  const followCaret = (edit: Edit) => {
    edit.caret = caretOffsetIn(edit.editedElement) ?? edit.caret;
  };

  const handleKey = (edit: Edit, isPlainTextOnly: boolean, event: KeyboardEvent) => {
    if (event.isComposing) return;
    if (event.key === CANCEL_KEY) {
      event.preventDefault();
      cancel();
    } else if (event.key === COMMIT_KEY && (!event.shiftKey || !isPlainTextOnly)) {
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
      event.clipboardData?.getData(PLAIN_TEXT_FORMAT) ?? ""
    );
  };

  const listen = (edit: Edit, isPlainTextOnly: boolean): (() => void) => {
    const { editedElement } = edit;
    const doc = editedElement.ownerDocument;
    const onInput = () => followTyping(edit);
    const onKey = (event: KeyboardEvent) => handleKey(edit, isPlainTextOnly, event);
    const onPaste = (event: ClipboardEvent) => pastePlainText(edit, event);
    const onSelection = () => followCaret(edit);
    editedElement.addEventListener("input", onInput);
    editedElement.addEventListener("keydown", onKey);
    editedElement.addEventListener("blur", commit);
    if (!isPlainTextOnly) editedElement.addEventListener("paste", onPaste);
    doc.addEventListener("selectionchange", onSelection);
    return () => {
      editedElement.removeEventListener("input", onInput);
      editedElement.removeEventListener("keydown", onKey);
      editedElement.removeEventListener("blur", commit);
      editedElement.removeEventListener("paste", onPaste);
      doc.removeEventListener("selectionchange", onSelection);
    };
  };

  return {
    begin(match, point) {
      if (editing?.match === match) return true;
      commit();

      const editedElement = tracker.beginEdit(match, {
        onShownAgain: () => {
          if (editing) placeCaret(editing.editedElement, editing.caret);
        },
        shownText: () => editing?.text ?? "",
      });
      if (!editedElement) return false;

      const doc = editedElement.ownerDocument;
      const isPlainTextOnly = takesPlainTextOnly(doc);
      const text = textOf(editedElement);
      const edit: Edit = {
        caret: text.length,
        editedElement,
        initialText: text,
        match,
        restored: new Map(EDITING_ATTRS.map((name) => [name, editedElement.getAttribute(name)])),
        stopListening: () => undefined,
        text,
        wasSent: false,
      };
      addEditingStyle(doc);
      editedElement.setAttribute(EDITABLE_ATTR, isPlainTextOnly ? PLAIN_TEXT_ONLY : RICH_TEXT);
      editedElement.setAttribute(SPELLCHECK_ATTR, SPELLCHECK_OFF);
      editedElement.setAttribute(DATA_VE_EDITING_ATTR, "");
      edit.stopListening = listen(edit, isPlainTextOnly);
      editing = edit;
      editedElement.focus();
      placeCaretAtPoint(editedElement, point);
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
