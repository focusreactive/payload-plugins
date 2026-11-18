import type { EditSession, EditSessionOptions } from "../richTextEditor.js";
import type { EditorSelection } from "./pageEditor.js";
import type { Toolbar } from "./toolbar.js";

import { ACCENT_VAR, DEFAULT_ACCENT } from "../../overlay/constants.js";
import { DATA_VE_EDITED_ATTR } from "../richTextTwin.js";
import { addEditingStyle, DATA_VE_EDITING_ATTR } from "../textEditing.js";
import {
  createPageEditor,
  ITALIC_CLASS,
  STRIKETHROUGH_CLASS,
  UNDERLINE_CLASS,
  UNDERLINE_STRIKETHROUGH_CLASS,
} from "./pageEditor.js";
import { DATA_VE_OPAQUE_SELECTED_ATTR } from "./opaqueNode.js";
import { lookOf } from "./renderedLook.js";
import { createToolbar } from "./toolbar.js";

const STYLE_ID = "ve-rich-text-editing-style";
const DATA_VE_RICH_TEXT_LOOK_ATTR = "data-ve-rich-text-look";
const EDITOR_ROLE = "textbox";
const SELECTED_PLACEHOLDER_STYLE = `[${DATA_VE_EDITING_ATTR}] [${DATA_VE_OPAQUE_SELECTED_ATTR}]{outline:2px solid var(${ACCENT_VAR}, ${DEFAULT_ACCENT});outline-offset:1px}`;
const TWIN_STYLE = `[${DATA_VE_EDITING_ATTR}][role="${EDITOR_ROLE}"]{outline:2px solid var(${ACCENT_VAR}, ${DEFAULT_ACCENT}) !important;outline-offset:2px !important}`;
const FORMAT_STYLE = `[${DATA_VE_EDITING_ATTR}] .${ITALIC_CLASS}{font-style:italic}[${DATA_VE_EDITING_ATTR}] .${UNDERLINE_CLASS}{text-decoration:underline}[${DATA_VE_EDITING_ATTR}] .${STRIKETHROUGH_CLASS}{text-decoration:line-through}[${DATA_VE_EDITING_ATTR}] .${UNDERLINE_STRIKETHROUGH_CLASS}{text-decoration:underline line-through}`;
const IN_CAPTURE_PHASE = true;
const ATTRS_OF_AN_EDITOR: Readonly<Record<string, string>> = {
  "aria-multiline": "true",
  contenteditable: "true",
  role: EDITOR_ROLE,
  spellcheck: "false",
  [DATA_VE_EDITING_ATTR]: "",
};

const addFormatStyle = (doc: Document): void => {
  if (doc.querySelector(`#${STYLE_ID}`)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `${TWIN_STYLE}${FORMAT_STYLE}${SELECTED_PLACEHOLDER_STYLE}`;
  doc.head.append(style);
};

const showLookStyle = (doc: Document, style: string, rendered: Element | null): void => {
  const isEditedAgain = rendered?.closest(`[${DATA_VE_EDITED_ATTR}]`) != null;
  if (style === "" && isEditedAgain) return;
  const shown =
    doc.querySelector(`style[${DATA_VE_RICH_TEXT_LOOK_ATTR}]`) ?? doc.createElement("style");
  shown.setAttribute(DATA_VE_RICH_TEXT_LOOK_ATTR, "");
  shown.textContent = style;
  if (!shown.isConnected) doc.head.append(shown);
};

export function startEditSession({
  caret,
  formats,
  onCancel,
  onChange,
  onCommit,
  rendered,
  state,
  twin,
}: EditSessionOptions): EditSession | null {
  const doc = twin.ownerDocument;
  const win = doc.defaultView ?? window;
  const editedAttrs = new Map(
    Object.keys(ATTRS_OF_AN_EDITOR).map((name) => [name, twin.getAttribute(name)])
  );
  let shownSelection: EditorSelection | null = null;
  let toolbar: Toolbar | null = null;
  for (const [name, value] of Object.entries(ATTRS_OF_AN_EDITOR)) twin.setAttribute(name, value);

  const showSelection = (selection: EditorSelection) => {
    shownSelection = selection;
    if (!toolbar || toolbar.isEditingLink()) return;
    toolbar.show(selection.formats, twin.getBoundingClientRect());
  };

  const editLink = () => {
    if (!shownSelection?.isRange || !toolbar) return;
    toolbar.show(shownSelection.formats, twin.getBoundingClientRect());
    toolbar.editLink();
  };

  const look = lookOf(rendered, state);
  const editor = createPageEditor(
    twin,
    state,
    formats,
    {
      onCancel,
      onChange,
      onError: onCancel,
      onLinkKey: editLink,
      onSelection: showSelection,
    },
    look
  );
  if (!editor) {
    for (const [name, value] of editedAttrs) {
      if (value === null) twin.removeAttribute(name);
      else twin.setAttribute(name, value);
    }
    return null;
  }

  const shownToolbar = createToolbar(doc, formats, {
    onLink: (url) => editor.setLink(url),
    onLinkClosed: () => {
      twin.focus({ preventScroll: true });
      editor.restoreSelection();
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

  const followTwin = () => {
    shownToolbar.follow(twin.getBoundingClientRect());
  };

  showLookStyle(doc, look.style ?? "", rendered);
  addEditingStyle(doc);
  addFormatStyle(doc);
  doc.addEventListener("pointerdown", commitOnPressOutside, IN_CAPTURE_PHASE);
  twin.addEventListener("focusout", commitWhenFocusLeaves);
  win.addEventListener("scroll", followTwin, IN_CAPTURE_PHASE);
  win.addEventListener("resize", followTwin);
  twin.addEventListener("input", followTwin);
  twin.focus({ preventScroll: true });
  editor.placeCaret(caret);
  if (!shownSelection) shownToolbar.show(editor.shownFormats(), twin.getBoundingClientRect());

  return {
    end() {
      doc.removeEventListener("pointerdown", commitOnPressOutside, IN_CAPTURE_PHASE);
      twin.removeEventListener("focusout", commitWhenFocusLeaves);
      win.removeEventListener("scroll", followTwin, IN_CAPTURE_PHASE);
      win.removeEventListener("resize", followTwin);
      twin.removeEventListener("input", followTwin);
      editor.destroy();
      shownToolbar.remove();
    },
  };
}
