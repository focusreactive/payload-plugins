import type {
  EditorState,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  PointType,
  RangeSelection,
  TextNode as TextNodeOfLexical,
} from "lexical";

import { createEmptyHistoryState, registerHistory } from "@lexical/history";
import {
  $insertList,
  $isListNode,
  $removeList,
  ListItemNode,
  ListNode,
  registerList,
} from "@lexical/list";
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
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  createEditor,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  FORMAT_TEXT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_DOWN_COMMAND,
  KEY_ESCAPE_COMMAND,
  ParagraphNode,
  PASTE_COMMAND,
  REMOVE_TEXT_COMMAND,
  TEXT_TYPE_TO_FORMAT,
  TextNode,
} from "lexical";

import type { VeEditorState } from "../../../shared/protocol.js";
import type { EditorNode } from "../../../shared/richText/editorNodes.js";
import type { VeRichTextFormats } from "../../../shared/richText/formats.js";

import { forEachEditableNode } from "../../../shared/richText/editableNodes.js";
import { rootOf } from "../../../shared/richText/editorNodes.js";
import { stateForEditor, stateOfEditor } from "./editableState.js";
import { $isOpaqueNode, DATA_VE_OPAQUE_SELECTED_ATTR, OpaqueNode } from "./opaqueNode.js";
import { PageAutoLinkNode } from "./pageAutoLinkNode.js";
import { PageLinkNode } from "./pageLinkNode.js";
import { $linkAround, $removeLinks, $setLink, $unwrapLink } from "./pageLinks.js";

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
const PLAIN_TEXT = "text/plain";
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

const $firstSelectedText = (selection: RangeSelection): TextNodeOfLexical | null => {
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

const $holdsOpaqueNode = (selection: RangeSelection): boolean =>
  !selection.isCollapsed() && selection.getNodes().some($isOpaqueNode);

const $removeTextAroundOpaqueNodes = (): boolean => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !$holdsOpaqueNode(selection)) return false;
  for (const node of selection.extract()) {
    if ($isTextNode(node) || $isLineBreakNode(node)) node.remove(true);
  }
  const collapsed = $getSelection();
  if ($isRangeSelection(collapsed)) {
    const { key, offset, type } = collapsed.anchor;
    collapsed.focus.set(key, offset, type);
  }
  return true;
};

const $isBesideOpaqueNode = (isBackward: boolean): boolean => {
  const selection = $getSelection();
  if ($isNodeSelection(selection)) return selection.getNodes().some($isOpaqueNode);
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  return $isOpaqueNode($nodeBeside(selection.anchor, isBackward));
};

const $deleteAroundOpaqueNodes = (isBackward: boolean, event: Event | null): boolean => {
  const isKept = $isBesideOpaqueNode(isBackward) || $removeTextAroundOpaqueNodes();
  if (isKept) event?.preventDefault();
  return isKept;
};

const $cutAroundOpaqueNodes = (event: ClipboardEvent | KeyboardEvent | null): boolean => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !$holdsOpaqueNode(selection)) return false;
  if (event && "clipboardData" in event) {
    event.clipboardData?.setData(PLAIN_TEXT, selection.getTextContent());
  }
  event?.preventDefault();
  return $removeTextAroundOpaqueNodes();
};

const $insertAroundOpaqueNodes = (): boolean => {
  $removeTextAroundOpaqueNodes();
  return false;
};

const $selectedOpaqueKeys = (): string[] => {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) return [];
  return selection
    .getNodes()
    .filter($isOpaqueNode)
    .map((node) => node.getKey());
};

const $opaqueNodesIn = (node: LexicalNode): EditorNode[] => {
  if ($isOpaqueNode(node)) return [node.__kept];
  return $isElementNode(node) ? node.getChildren().flatMap($opaqueNodesIn) : [];
};

const $keptNodes = (): EditorNode[] => $opaqueNodesIn($getRoot());

const isSameSequence = (one: readonly EditorNode[], other: readonly EditorNode[]): boolean =>
  one.length === other.length && one.every((kept, position) => kept === other[position]);

const $startParagraphIfEmpty = (): void => {
  const root = $getRoot();
  if (root.isEmpty()) root.append($createParagraphNode());
};

const $asParagraph = (block: ElementNode): void => {
  block.replace($createParagraphNode(), true);
};

const $asParagraphs = (list: ListNode): void => {
  for (const item of list.getChildren()) {
    const paragraph = $createParagraphNode();
    const children = $isElementNode(item) ? item.getChildren() : [];
    for (const child of children) {
      if ($isListNode(child)) list.insertBefore(child);
      else paragraph.append(child);
    }
    if (!paragraph.isEmpty()) list.insertBefore(paragraph);
  }
  list.remove();
};

const stylesIn = (state: VeEditorState): Set<string> => {
  const styles = new Set<string>();
  forEachEditableNode(state, ({ style, textStyle }) => {
    for (const held of [style, textStyle]) {
      if (typeof held === "string") styles.add(held);
    }
  });
  return styles;
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

const registerAllowedFormats = (
  editor: LexicalEditor,
  formats: VeRichTextFormats,
  styles: ReadonlySet<string>
): (() => void) => {
  const $keepAllowedTextFormats = (block: ElementNode) => {
    const allowed = block.getTextFormat() & formats.textFormats;
    if (allowed !== block.getTextFormat()) block.setTextFormat(allowed);
    if (!styles.has(block.getTextStyle()) && block.getTextStyle() !== "") block.setTextStyle("");
  };
  const $unwrapUnlessAllowed = (link: PageLinkNode) => {
    if (!formats.hasLinks) $unwrapLink(link);
  };

  return mergeRegister(
    editor.registerNodeTransform(TextNode, (text) => {
      const allowed = text.getFormat() & formats.textFormats;
      if (allowed !== text.getFormat()) text.setFormat(allowed);
      if (!styles.has(text.getStyle()) && text.getStyle() !== "") text.setStyle("");
    }),
    editor.registerNodeTransform(ParagraphNode, $keepAllowedTextFormats),
    editor.registerNodeTransform(ListItemNode, $keepAllowedTextFormats),
    editor.registerNodeTransform(HeadingNode, (heading) => {
      if (formats.headings.includes(heading.getTag())) $keepAllowedTextFormats(heading);
      else $asParagraph(heading);
    }),
    editor.registerNodeTransform(QuoteNode, (quote) => {
      if (formats.hasQuotes) $keepAllowedTextFormats(quote);
      else $asParagraph(quote);
    }),
    editor.registerNodeTransform(ListNode, (list) => {
      if (!formats.lists.includes(list.getListType())) $asParagraphs(list);
    }),
    editor.registerNodeTransform(PageLinkNode, $unwrapUnlessAllowed),
    editor.registerNodeTransform(PageAutoLinkNode, $unwrapUnlessAllowed),
    editor.registerCommand(
      FORMAT_TEXT_COMMAND,
      (format) => ((TEXT_TYPE_TO_FORMAT[format] ?? 0) & formats.textFormats) === 0,
      COMMAND_PRIORITY_CRITICAL
    )
  );
};

const registerKeptOpaqueNodes = (editor: LexicalEditor, kept: readonly EditorNode[]) => {
  const stored = new WeakSet(kept);
  return mergeRegister(
    editor.registerNodeTransform(OpaqueNode, (node) => {
      if (!stored.has(node.__kept)) node.remove();
    }),
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => $deleteAroundOpaqueNodes(true, event),
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand(
      KEY_DELETE_COMMAND,
      (event) => $deleteAroundOpaqueNodes(false, event),
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      (isBackward) => $deleteAroundOpaqueNodes(isBackward, null),
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand(
      DELETE_WORD_COMMAND,
      (isBackward) => $deleteAroundOpaqueNodes(isBackward, null),
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand(
      DELETE_LINE_COMMAND,
      (isBackward) => $deleteAroundOpaqueNodes(isBackward, null),
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand(
      REMOVE_TEXT_COMMAND,
      $removeTextAroundOpaqueNodes,
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand(CUT_COMMAND, $cutAroundOpaqueNodes, COMMAND_PRIORITY_CRITICAL),
    editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      $insertAroundOpaqueNodes,
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      $insertAroundOpaqueNodes,
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand(
      INSERT_LINE_BREAK_COMMAND,
      $insertAroundOpaqueNodes,
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand(PASTE_COMMAND, $insertAroundOpaqueNodes, COMMAND_PRIORITY_CRITICAL)
  );
};

export function createPageEditor(
  twin: HTMLElement,
  state: VeEditorState,
  formats: VeRichTextFormats,
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
  if (!hasFailedToLoad) editor.setRootElement(twin);
  if (hasFailedToLoad) {
    editor.setRootElement(null);
    return null;
  }
  isLoaded = true;
  const kept = editor.getEditorState().read($keptNodes);

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

  const reportChange = () => {
    const changed = stateNow();
    const serialized = JSON.stringify(changed);
    if (serialized === reported) return;
    reported = serialized;
    events.onChange(changed);
  };

  const showSelectedPlaceholders = (keys: readonly string[]) => {
    for (const placeholder of selectedPlaceholders) {
      placeholder.removeAttribute(DATA_VE_OPAQUE_SELECTED_ATTR);
    }
    selectedPlaceholders = keys.flatMap((key) => editor.getElementByKey(key) ?? []);
    for (const placeholder of selectedPlaceholders) {
      placeholder.setAttribute(DATA_VE_OPAQUE_SELECTED_ATTR, "");
    }
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

  const holdsItsOpaqueNodes = (editorState: EditorState): boolean =>
    isSameSequence(editorState.read($keptNodes), kept);

  const stopListening = mergeRegister(
    registerKeptOpaqueNodes(editor, kept),
    registerAllowedFormats(editor, formats, stylesIn(state)),
    registerRichText(editor),
    registerList(editor),
    registerHistory(editor, createEmptyHistoryState(), HISTORY_MERGE_PAUSE_MS),
    editor.registerUpdateListener(
      ({ dirtyElements, dirtyLeaves, editorState, prevEditorState }) => {
        if (!holdsItsOpaqueNodes(editorState)) {
          editor.setEditorState(prevEditorState);
          return;
        }
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) reportChange();
        editorState.read($rememberRange);
        showSelectedPlaceholders(editorState.read($selectedOpaqueKeys));
        events.onSelection(editorState.read($shownSelection));
      }
    ),
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
    )
  );

  return {
    destroy() {
      stopListening();
      editor.setRootElement(null);
    },
    setLink(url) {
      updateSelection((selection) => {
        if (selection.isCollapsed()) return;
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
