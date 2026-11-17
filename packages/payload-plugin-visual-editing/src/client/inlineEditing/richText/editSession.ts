import type { VeEditorState } from "../../../shared/protocol.js";
import type { Point } from "../caret.js";
import type { EditorSelection } from "./pageEditor.js";
import type { Toolbar } from "./toolbar.js";

import { ACCENT_VAR, DEFAULT_ACCENT } from "../../overlay/constants.js";
import { placeCaretAtPoint } from "../caret.js";
import { addEditingStyle, DATA_VE_EDITING_ATTR } from "../textEditing.js";
import {
  createPageEditor,
  STRIKETHROUGH_CLASS,
  UNDERLINE_CLASS,
  UNDERLINE_STRIKETHROUGH_CLASS,
} from "./pageEditor.js";
import { DATA_VE_OPAQUE_SELECTED_ATTR } from "./opaqueNode.js";
import { createToolbar } from "./toolbar.js";

export type EditSessionOptions = {
  twin: HTMLElement;
  state: VeEditorState;
  point: Point | null;
  onChange(state: VeEditorState): void;
  onCancel(): void;
  onCommit(): void;
};

export interface EditSession {
  end(): void;
}

const STYLE_ID = "ve-rich-text-editing-style";
const SELECTED_PLACEHOLDER_STYLE = `[${DATA_VE_EDITING_ATTR}] [${DATA_VE_OPAQUE_SELECTED_ATTR}]{outline:2px solid var(${ACCENT_VAR}, ${DEFAULT_ACCENT});outline-offset:1px}`;
const FORMAT_STYLE = `[${DATA_VE_EDITING_ATTR}] .${UNDERLINE_CLASS}{text-decoration:underline}[${DATA_VE_EDITING_ATTR}] .${STRIKETHROUGH_CLASS}{text-decoration:line-through}[${DATA_VE_EDITING_ATTR}] .${UNDERLINE_STRIKETHROUGH_CLASS}{text-decoration:underline line-through}`;
const IN_CAPTURE_PHASE = true;
const ATTRS_OF_AN_EDITOR: Readonly<Record<string, string>> = {
  "aria-multiline": "true",
  contenteditable: "true",
  role: "textbox",
  [DATA_VE_EDITING_ATTR]: "",
};

const addFormatStyle = (doc: Document): void => {
  if (doc.querySelector(`#${STYLE_ID}`)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `${FORMAT_STYLE}${SELECTED_PLACEHOLDER_STYLE}`;
  doc.head.append(style);
};

const rectOfSelectionIn = (twin: HTMLElement): DOMRect => {
  const selection = twin.ownerDocument.getSelection();
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const isInTwin = range !== null && twin.contains(range.commonAncestorContainer);
  const rect =
    isInTwin && typeof range.getBoundingClientRect === "function"
      ? range.getBoundingClientRect()
      : null;
  return rect && (rect.width > 0 || rect.height > 0) ? rect : twin.getBoundingClientRect();
};

export function startEditSession({
  onCancel,
  onChange,
  onCommit,
  point,
  state,
  twin,
}: EditSessionOptions): EditSession | null {
  const doc = twin.ownerDocument;
  const win = doc.defaultView ?? window;
  let shownSelection: EditorSelection | null = null;
  let selectionRect = twin.getBoundingClientRect();
  for (const [name, value] of Object.entries(ATTRS_OF_AN_EDITOR)) twin.setAttribute(name, value);

  let toolbar: Toolbar | null = null;

  const showSelection = (selection: EditorSelection) => {
    shownSelection = selection;
    if (!toolbar || toolbar.isEditingLink()) return;
    if (!selection.isRange) {
      toolbar.hide();
      return;
    }
    selectionRect = rectOfSelectionIn(twin);
    toolbar.show(selection.formats, selectionRect);
  };

  const editLink = () => {
    if (!shownSelection || !toolbar) return;
    selectionRect = rectOfSelectionIn(twin);
    toolbar.show(shownSelection.formats, selectionRect);
    toolbar.editLink();
  };

  const editor = createPageEditor(twin, state, {
    onCancel,
    onChange,
    onError: onCancel,
    onLinkKey: editLink,
    onSelection: showSelection,
  });
  if (!editor) return null;

  const shownToolbar = createToolbar(doc, {
    onLink: (url) => editor.setLink(url),
    onLinkClosed: () => {
      twin.focus({ preventScroll: true });
      if (shownSelection) showSelection(shownSelection);
    },
    onToggle: (action) => editor.toggle(action),
  });
  toolbar = shownToolbar;

  const isOutside = (target: EventTarget | null): boolean =>
    target instanceof Node && !twin.contains(target) && !shownToolbar.host.contains(target);

  const commitOnPressOutside = (event: Event) => {
    if (isOutside(event.target)) onCommit();
  };

  const commitWhenFocusLeaves = (event: FocusEvent) => {
    if (isOutside(event.relatedTarget)) onCommit();
  };

  const followSelection = () => {
    if (!shownToolbar.isEditingLink()) selectionRect = rectOfSelectionIn(twin);
    shownToolbar.follow(selectionRect);
  };

  addEditingStyle(doc);
  addFormatStyle(doc);
  doc.addEventListener("pointerdown", commitOnPressOutside, IN_CAPTURE_PHASE);
  twin.addEventListener("focusout", commitWhenFocusLeaves);
  win.addEventListener("scroll", followSelection, IN_CAPTURE_PHASE);
  win.addEventListener("resize", followSelection);
  twin.focus({ preventScroll: true });
  if (point) placeCaretAtPoint(twin, point);

  return {
    end() {
      doc.removeEventListener("pointerdown", commitOnPressOutside, IN_CAPTURE_PHASE);
      twin.removeEventListener("focusout", commitWhenFocusLeaves);
      win.removeEventListener("scroll", followSelection, IN_CAPTURE_PHASE);
      win.removeEventListener("resize", followSelection);
      editor.destroy();
      shownToolbar.remove();
    },
  };
}
