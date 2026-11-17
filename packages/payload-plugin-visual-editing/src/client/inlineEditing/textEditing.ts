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
  dispose(): void;
}

type Edit = {
  match: FieldMatch;
  holder: HTMLElement;
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
const LINE_BREAK_TAG = "BR";
const STYLE_ID = "ve-inline-editing-style";
const EDITING_STYLE = `[${DATA_VE_EDITING_ATTR}]{outline:2px solid var(${ACCENT_VAR}, ${DEFAULT_ACCENT}) !important;outline-offset:2px !important;cursor:text !important}`;

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

const textOf = (holder: Element): string => Array.from(holder.childNodes).map(textOfNode).join("");

const insertText = (doc: Document, text: string): void => {
  if (typeof doc.execCommand === "function") doc.execCommand("insertText", false, text);
};

const isInsideButton = (holder: Element): boolean => holder.closest("button") !== null;

const addEditingStyle = (doc: Document): void => {
  if (doc.querySelector(`#${STYLE_ID}`)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = EDITING_STYLE;
  doc.head.append(style);
};

const setAttributes = (
  holder: HTMLElement,
  attributes: ReadonlyMap<string, string | null>
): void => {
  for (const [name, value] of attributes) {
    if (value === null) holder.removeAttribute(name);
    else holder.setAttribute(name, value);
  }
};

export function createTextEditing({ flush, send, tracker }: TextEditingDeps): TextEditing {
  let editing: Edit | null = null;

  const end = (text: string) => {
    const ended = editing;
    if (!ended) return;
    editing = null;
    ended.stopListening();
    setAttributes(ended.holder, ended.restored);
    tracker.endEdit(ended.match, text);
    flush();
    if (ended.holder.ownerDocument.activeElement === ended.holder) ended.holder.blur();
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
    edit.text = textOf(edit.holder);
    edit.caret = caretOffsetIn(edit.holder) ?? edit.caret;
    edit.wasSent = true;
    send(edit.match, edit.text);
  };

  const followCaret = (edit: Edit) => {
    edit.caret = caretOffsetIn(edit.holder) ?? edit.caret;
  };

  const handleKey = (edit: Edit, isPlainTextOnly: boolean, event: KeyboardEvent) => {
    const doc = edit.holder.ownerDocument;
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === "Enter" && (!event.shiftKey || !isPlainTextOnly)) {
      event.preventDefault();
      commit();
    } else if (event.key === " " && isInsideButton(edit.holder)) {
      event.preventDefault();
      insertText(doc, " ");
    }
  };

  const pastePlainText = (edit: Edit, event: ClipboardEvent) => {
    event.preventDefault();
    insertText(edit.holder.ownerDocument, event.clipboardData?.getData("text/plain") ?? "");
  };

  const listen = (edit: Edit, isPlainTextOnly: boolean): (() => void) => {
    const { holder } = edit;
    const doc = holder.ownerDocument;
    const onInput = () => followTyping(edit);
    const onKey = (event: KeyboardEvent) => handleKey(edit, isPlainTextOnly, event);
    const onPaste = (event: ClipboardEvent) => pastePlainText(edit, event);
    const onSelection = () => followCaret(edit);
    holder.addEventListener("input", onInput);
    holder.addEventListener("keydown", onKey);
    holder.addEventListener("blur", commit);
    if (!isPlainTextOnly) holder.addEventListener("paste", onPaste);
    doc.addEventListener("selectionchange", onSelection);
    return () => {
      holder.removeEventListener("input", onInput);
      holder.removeEventListener("keydown", onKey);
      holder.removeEventListener("blur", commit);
      holder.removeEventListener("paste", onPaste);
      doc.removeEventListener("selectionchange", onSelection);
    };
  };

  return {
    begin(match, point) {
      const { holder } = match;
      if (!(holder instanceof HTMLElement)) return false;
      if (editing?.match === match) return true;
      commit();

      const text = textOf(holder);
      const edit: Edit = {
        caret: text.length,
        holder,
        initialText: text,
        match,
        restored: new Map(
          [EDITABLE_ATTR, SPELLCHECK_ATTR, DATA_VE_EDITING_ATTR].map((name) => [
            name,
            holder.getAttribute(name),
          ])
        ),
        stopListening: () => undefined,
        text,
        wasSent: false,
      };
      const isTracked = tracker.beginEdit(match, {
        onShownAgain: () => placeCaret(holder, edit.caret),
        shownText: () => edit.text,
      });
      if (!isTracked) return false;

      const doc = holder.ownerDocument;
      const isPlainTextOnly = takesPlainTextOnly(doc);
      addEditingStyle(doc);
      holder.setAttribute(EDITABLE_ATTR, isPlainTextOnly ? PLAIN_TEXT_ONLY : RICH_TEXT);
      holder.setAttribute(SPELLCHECK_ATTR, "false");
      holder.setAttribute(DATA_VE_EDITING_ATTR, "");
      edit.stopListening = listen(edit, isPlainTextOnly);
      editing = edit;
      holder.focus();
      placeCaretAtPoint(holder, point);
      followCaret(edit);
      return true;
    },
    commit,
    dispose() {
      commit();
    },
    isEditing: (holder) => editing?.holder === holder,
  };
}
