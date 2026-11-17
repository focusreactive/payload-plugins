import type {
  ElementNode,
  LexicalEditor,
  LexicalNode,
  PointType,
  RangeSelection,
  TextNode,
} from "lexical";

import { createEmptyHistoryState, registerHistory } from "@lexical/history";
import { $insertList, $removeList, ListItemNode, ListNode, registerList } from "@lexical/list";
import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingNode,
  QuoteNode,
  registerRichText,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
  $createNodeSelection,
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_HIGH,
  createEditor,
  FORMAT_TEXT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_DOWN_COMMAND,
  KEY_ESCAPE_COMMAND,
} from "lexical";

import type { VeEditorState } from "../../../shared/protocol.js";

import { rootOf } from "../../../shared/richText/editorNodes.js";
import { stateForEditor, stateOfEditor } from "./editableState.js";
import { $isOpaqueNode, DATA_VE_OPAQUE_SELECTED_ATTR, OpaqueNode } from "./opaqueNode.js";
import { PageAutoLinkNode } from "./pageAutoLinkNode.js";
import { PageLinkNode } from "./pageLinkNode.js";
import { $linkAround, $removeLinks, $setLink } from "./pageLinks.js";

export type TextFormat = "bold" | "italic" | "underline";

export type HeadingTag = "h2" | "h3";

export type ListKind = "bullet" | "number";

export type ToolbarAction = HeadingTag | ListKind | TextFormat;

export type ShownFormats = Record<ToolbarAction, boolean> & { link: string | null };

export type EditorSelection = { formats: ShownFormats; isRange: boolean };

export type PageEditorEvents = {
  onChange(state: VeEditorState): void;
  onSelection(selection: EditorSelection): void;
  onCancel(): void;
  onLinkKey(): void;
  onError(): void;
};

export interface PageEditor {
  state(): VeEditorState;
  toggle(action: ToolbarAction): void;
  setLink(url: string | null): void;
  destroy(): void;
}

export const UNDERLINE_CLASS = "ve-rich-text-underline";
export const STRIKETHROUGH_CLASS = "ve-rich-text-strikethrough";
export const UNDERLINE_STRIKETHROUGH_CLASS = "ve-rich-text-underline-strikethrough";

const NAMESPACE = "visual-editing";
const HISTORY_MERGE_PAUSE_MS = 1000;
const LINK_KEY = "k";
const TEXT_FORMATS: readonly TextFormat[] = ["bold", "italic", "underline"];
const HEADING_TAGS: readonly HeadingTag[] = ["h2", "h3"];

const NO_FORMATS: ShownFormats = {
  bold: false,
  bullet: false,
  h2: false,
  h3: false,
  italic: false,
  link: null,
  number: false,
  underline: false,
};

const isTextFormat = (action: ToolbarAction): action is TextFormat =>
  (TEXT_FORMATS as readonly string[]).includes(action);

const isHeadingTag = (action: ToolbarAction): action is HeadingTag =>
  (HEADING_TAGS as readonly string[]).includes(action);

const $blockOf = (selection: RangeSelection): ElementNode | null => {
  const node = selection.anchor.getNode();
  return $isRootOrShadowRoot(node) ? null : node.getTopLevelElement();
};

const $listKindOf = (selection: RangeSelection): string | null =>
  $getNearestNodeOfType(selection.anchor.getNode(), ListNode)?.getListType() ?? null;

const $linkOf = (selection: RangeSelection): string | null => {
  for (const node of selection.getNodes()) {
    const link = $linkAround(node);
    if (link) return link.getUrl();
  }
  return null;
};

const $firstSelectedText = (selection: RangeSelection): TextNode | null => {
  const [first, second] = selection.getNodes().filter($isTextNode);
  if (!first) return null;
  const start = selection.isBackward() ? selection.focus : selection.anchor;
  const startsAfterFirst =
    start.key === first.getKey() && start.offset === first.getTextContentSize();
  return startsAfterFirst && second ? second : first;
};

const $hasFormat = (selection: RangeSelection, format: TextFormat): boolean => {
  const first = selection.isCollapsed() ? null : $firstSelectedText(selection);
  return first ? first.hasFormat(format) : selection.hasFormat(format);
};

const $formatsOf = (selection: RangeSelection): ShownFormats => {
  const block = $blockOf(selection);
  const headingTag = $isHeadingNode(block) ? block.getTag() : null;
  const listKind = $listKindOf(selection);
  return {
    bold: $hasFormat(selection, "bold"),
    bullet: listKind === "bullet",
    h2: headingTag === "h2",
    h3: headingTag === "h3",
    italic: $hasFormat(selection, "italic"),
    link: $linkOf(selection),
    number: listKind === "number",
    underline: $hasFormat(selection, "underline"),
  };
};

const $shownSelection = (): EditorSelection => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return { formats: NO_FORMATS, isRange: false };
  return { formats: $formatsOf(selection), isRange: !selection.isCollapsed() };
};

const $toggleHeading = (selection: RangeSelection, tag: HeadingTag): void => {
  const block = $blockOf(selection);
  const isShown = $isHeadingNode(block) && block.getTag() === tag;
  $setBlocksType(selection, () => (isShown ? $createParagraphNode() : $createHeadingNode(tag)));
};

const $toggleList = (selection: RangeSelection, kind: ListKind): void => {
  if ($listKindOf(selection) === kind) $removeList();
  else $insertList(kind);
};

const $isAtEdge = (point: PointType, node: LexicalNode, isBackward: boolean): boolean => {
  if (!$isTextNode(node)) return true;
  return isBackward ? point.offset === 0 : point.offset === node.getTextContentSize();
};

const $childBeside = (point: PointType, node: LexicalNode, isBackward: boolean) =>
  $isElementNode(node) ? node.getChildAtIndex(isBackward ? point.offset - 1 : point.offset) : null;

const $nodeBeside = (point: PointType, isBackward: boolean): LexicalNode | null => {
  const node = point.getNode();
  if (!$isAtEdge(point, node, isBackward)) return null;
  const child = $childBeside(point, node, isBackward);
  if (child) return child;
  if ($isElementNode(node) && !node.isEmpty()) return null;
  for (
    let ancestor: LexicalNode | null = node;
    ancestor && !$isRootOrShadowRoot(ancestor);
    ancestor = ancestor.getParent()
  ) {
    const sibling = isBackward ? ancestor.getPreviousSibling() : ancestor.getNextSibling();
    if (sibling) return sibling;
  }
  return null;
};

const $select = (node: OpaqueNode): void => {
  const selection = $createNodeSelection();
  selection.add(node.getKey());
  $setSelection(selection);
};

const $removeSelectedOpaqueNodes = (): boolean => {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) return false;
  const selected = selection.getNodes().filter($isOpaqueNode);
  if (selected.length === 0) return false;
  const [first] = selected;
  const neighbour = first?.getPreviousSibling() ?? first?.getNextSibling() ?? null;
  for (const node of selected) node.remove();
  if (neighbour) neighbour.selectEnd();
  else $getRoot().selectEnd();
  return true;
};

const $selectOpaqueNodeBeside = (isBackward: boolean): boolean => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const beside = $nodeBeside(selection.anchor, isBackward);
  if (!$isOpaqueNode(beside)) return false;
  $select(beside);
  return true;
};

const $deleteDeliberately = (event: KeyboardEvent, isBackward: boolean): boolean => {
  const isHandled = $removeSelectedOpaqueNodes() || $selectOpaqueNodeBeside(isBackward);
  if (isHandled) event.preventDefault();
  return isHandled;
};

const $selectedOpaqueKeys = (): string[] => {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) return [];
  return selection
    .getNodes()
    .filter($isOpaqueNode)
    .map((node) => node.getKey());
};

const $startParagraphIfEmpty = (): void => {
  const root = $getRoot();
  if (root.isEmpty()) root.append($createParagraphNode());
};

const isLinkKey = (event: KeyboardEvent): boolean =>
  event.key.toLowerCase() === LINK_KEY && (event.metaKey || event.ctrlKey) && !event.altKey;

const hasContent = (state: VeEditorState): boolean => {
  const root = rootOf(state);
  return root !== null && Array.isArray(root.children) && root.children.length > 0;
};

const loadState = (editor: LexicalEditor, state: VeEditorState): void => {
  if (hasContent(state)) {
    editor.setEditorState(editor.parseEditorState(JSON.stringify(stateForEditor(state))));
  }
  editor.update($startParagraphIfEmpty, { discrete: true });
};

export function createPageEditor(
  twin: HTMLElement,
  state: VeEditorState,
  events: PageEditorEvents
): PageEditor | null {
  let isLoaded = false;
  let hasFailedToLoad = false;
  let lastRange: RangeSelection | null = null;
  const editor = createEditor({
    namespace: NAMESPACE,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      PageLinkNode,
      PageAutoLinkNode,
      OpaqueNode,
    ],
    onError: () => {
      if (isLoaded) events.onError();
      else hasFailedToLoad = true;
    },
    theme: {
      text: {
        strikethrough: STRIKETHROUGH_CLASS,
        underline: UNDERLINE_CLASS,
        underlineStrikethrough: UNDERLINE_STRIKETHROUGH_CLASS,
      },
    },
  });
  loadState(editor, state);
  if (hasFailedToLoad) return null;
  editor.setRootElement(twin);
  isLoaded = true;

  const $rangeToChange = (): RangeSelection | null => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) return selection;
    if (!lastRange) return null;
    const restored = lastRange.clone();
    $setSelection(restored);
    return restored;
  };

  const $rememberRange = (): void => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) lastRange = selection.clone();
  };

  const stateNow = (): VeEditorState =>
    stateOfEditor(editor.getEditorState().toJSON() as unknown as VeEditorState);

  let reported = JSON.stringify(stateNow());
  let selectedPlaceholders: HTMLElement[] = [];

  const showSelectedPlaceholders = (keys: readonly string[]) => {
    for (const placeholder of selectedPlaceholders) {
      placeholder.removeAttribute(DATA_VE_OPAQUE_SELECTED_ATTR);
    }
    selectedPlaceholders = keys.flatMap((key) => editor.getElementByKey(key) ?? []);
    for (const placeholder of selectedPlaceholders) {
      placeholder.setAttribute(DATA_VE_OPAQUE_SELECTED_ATTR, "");
    }
  };

  const reportChange = () => {
    const changed = stateNow();
    const serialized = JSON.stringify(changed);
    if (serialized === reported) return;
    reported = serialized;
    events.onChange(changed);
  };

  const updateSelection = (update: (selection: RangeSelection) => void): void => {
    editor.update(
      () => {
        const selection = $rangeToChange();
        if (selection) update(selection);
      },
      { discrete: true }
    );
  };

  const stopListening = mergeRegister(
    registerRichText(editor),
    registerList(editor),
    registerHistory(editor, createEmptyHistoryState(), HISTORY_MERGE_PAUSE_MS),
    editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, editorState }) => {
      if (dirtyElements.size > 0 || dirtyLeaves.size > 0) reportChange();
      editorState.read($rememberRange);
      showSelectedPlaceholders(editorState.read($selectedOpaqueKeys));
      events.onSelection(editorState.read($shownSelection));
    }),
    editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event) => {
        event.preventDefault();
        events.onCancel();
        return true;
      },
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (!isLinkKey(event)) return false;
        event.preventDefault();
        events.onLinkKey();
        return true;
      },
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => $deleteDeliberately(event, true),
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      KEY_DELETE_COMMAND,
      (event) => $deleteDeliberately(event, false),
      COMMAND_PRIORITY_HIGH
    )
  );

  return {
    destroy() {
      stopListening();
      editor.setRootElement(null);
    },
    setLink(url) {
      updateSelection((selection) => {
        if (url === null) $removeLinks(selection);
        else $setLink(selection, url);
      });
    },
    state: stateNow,
    toggle(action) {
      if (isTextFormat(action)) {
        updateSelection(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, action));
      } else if (isHeadingTag(action)) {
        updateSelection((selection) => $toggleHeading(selection, action));
      } else {
        updateSelection((selection) => $toggleList(selection, action));
      }
    },
  };
}
