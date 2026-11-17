import type {
  EditorState,
  EditorThemeClasses,
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
  $addUpdateTag,
  $createNodeSelection,
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  createEditor,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  FORMAT_TEXT_COMMAND,
  HISTORIC_TAG,
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
import type { TextPosition } from "../caret.js";

import { forEachEditableNode } from "../../../shared/richText/editableNodes.js";
import { rootOf } from "../../../shared/richText/editorNodes.js";
import { stateForEditor, stateOfEditor } from "./editableState.js";
import {
  $isOpaqueNode,
  DATA_VE_OPAQUE_ATTR,
  DATA_VE_OPAQUE_SELECTED_ATTR,
  OpaqueNode,
  showAs,
} from "./opaqueNode.js";
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
  placeCaret(position: TextPosition | null): void;
  restoreSelection(): void;
  destroy(): void;
}

export type RenderedLook = {
  theme: EditorThemeClasses;
  fixedNodes: readonly (HTMLElement | null)[] | null;
};

export const UNDERLINE_CLASS = "ve-rich-text-underline";
export const STRIKETHROUGH_CLASS = "ve-rich-text-strikethrough";
export const UNDERLINE_STRIKETHROUGH_CLASS = "ve-rich-text-underline-strikethrough";

const NAMESPACE = "visual-editing";
const HISTORY_MERGE_PAUSE_MS = 1000;
const OPAQUE_REMOVAL_TAG = "ve-opaque-removal";
const PLACEHOLDER = `[${DATA_VE_OPAQUE_ATTR}]`;
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
  if ($isTextNode(node)) {
    return isBackward ? point.offset === 0 : point.offset === node.getTextContentSize();
  }
  if (!$isElementNode(node)) return true;
  return isBackward ? point.offset === 0 : point.offset === node.getChildrenSize();
};

const $childBeside = (point: PointType, node: LexicalNode, isBackward: boolean) =>
  $isElementNode(node) ? node.getChildAtIndex(isBackward ? point.offset - 1 : point.offset) : null;

const $edgeOf = (node: LexicalNode, isBackward: boolean): LexicalNode => {
  if (!$isElementNode(node)) return node;
  return (isBackward ? node.getLastDescendant() : node.getFirstDescendant()) ?? node;
};

const $nodeBeside = (point: PointType, isBackward: boolean): LexicalNode | null => {
  const node = point.getNode();
  const child = $childBeside(point, node, isBackward);
  if (child) return $edgeOf(child, isBackward);
  if (!$isAtEdge(point, node, isBackward)) return null;
  for (
    let ancestor: LexicalNode | null = node;
    ancestor && !$isRootOrShadowRoot(ancestor);
    ancestor = ancestor.getParent()
  ) {
    const sibling = isBackward ? ancestor.getPreviousSibling() : ancestor.getNextSibling();
    if (sibling) return $edgeOf(sibling, isBackward);
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

const $startParagraphIfEmpty = (): void => {
  const root = $getRoot();
  if (root.isEmpty()) root.append($createParagraphNode());
};

const $selectedOpaqueNodes = (): OpaqueNode[] => {
  const selection = $getSelection();
  return $isNodeSelection(selection) ? selection.getNodes().filter($isOpaqueNode) : [];
};

const $selectOpaqueNode = (node: OpaqueNode): void => {
  const selection = $createNodeSelection();
  selection.add(node.getKey());
  $setSelection(selection);
};

const $removeEmptyBlockOf = (point: PointType): void => {
  const block = point.getNode();
  if ($isElementNode(block) && block.isEmpty() && $isRootOrShadowRoot(block.getParent())) {
    block.remove();
  }
};

const $selectOpaqueNodeBeside = (isBackward: boolean): boolean => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const beside = $nodeBeside(selection.anchor, isBackward);
  if (!$isOpaqueNode(beside)) return false;
  $removeEmptyBlockOf(selection.anchor);
  $selectOpaqueNode(beside);
  return true;
};

const $removeOpaqueNode = (node: OpaqueNode): void => {
  const before = node.getPreviousSibling();
  const after = node.getNextSibling();
  const parent = node.getParent();
  node.remove(true);
  $startParagraphIfEmpty();
  if (before) before.selectEnd();
  else if (after) after.selectStart();
  else (parent?.isAttached() ? parent : $getRoot()).selectStart();
};

const $removeSelectedOpaqueNodes = (): boolean => {
  const selected = $selectedOpaqueNodes();
  if (selected.length === 0) return false;
  $addUpdateTag(OPAQUE_REMOVAL_TAG);
  for (const node of selected) $removeOpaqueNode(node);
  return true;
};

const $deleteAroundOpaqueNodes = (isBackward: boolean, event: Event | null): boolean => {
  const isHandled =
    $removeSelectedOpaqueNodes() ||
    $selectOpaqueNodeBeside(isBackward) ||
    $removeTextAroundOpaqueNodes();
  if (isHandled) event?.preventDefault();
  return isHandled;
};

const $selectClickedOpaqueNode = (event: MouseEvent): boolean => {
  const placeholder = event.target instanceof Element ? event.target.closest(PLACEHOLDER) : null;
  const node = placeholder && $getNearestNodeFromDOMNode(placeholder);
  if (!$isOpaqueNode(node)) return false;
  event.preventDefault();
  $selectOpaqueNode(node);
  return true;
};

const $cutAroundOpaqueNodes = (event: ClipboardEvent | KeyboardEvent | null): boolean => {
  const selection = $getSelection();
  if ($selectedOpaqueNodes().length > 0) {
    event?.preventDefault();
    return true;
  }
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

const $selectedOpaqueKeys = (): string[] => $selectedOpaqueNodes().map((node) => node.getKey());

const $opaqueNodesIn = (node: LexicalNode): EditorNode[] => {
  if ($isOpaqueNode(node)) return [node.__kept];
  return $isElementNode(node) ? node.getChildren().flatMap($opaqueNodesIn) : [];
};

const $keptNodes = (): EditorNode[] => $opaqueNodesIn($getRoot());

const isSameSequence = (one: readonly EditorNode[], other: readonly EditorNode[]): boolean =>
  one.length === other.length && one.every((kept, position) => kept === other[position]);

const isPartOfSequence = (part: readonly EditorNode[], whole: readonly EditorNode[]): boolean => {
  let next = 0;
  for (const kept of part) {
    const found = whole.indexOf(kept, next);
    if (found === -1) return false;
    next = found + 1;
  }
  return true;
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

const $positionOf = ({ isAtStart, offset }: TextPosition): [TextNodeOfLexical, number] | null => {
  let before = 0;
  let found: [TextNodeOfLexical, number] | null = null;
  for (const node of $getRoot().getAllTextNodes()) {
    const size = node.getTextContentSize();
    if (isAtStart && before === offset && size > 0) return [node, 0];
    if (!found && offset >= before && offset <= before + size) found = [node, offset - before];
    if (found && !isAtStart) return found;
    before += size;
  }
  return found;
};

const $placeCaret = (position: TextPosition | null): void => {
  const found = position && $positionOf(position);
  if (found) found[0].select(found[1], found[1]);
  else $getRoot().selectEnd();
};

const $showFixedNodesAs = (elements: readonly (HTMLElement | null)[]): void => {
  const topLevel = $getRoot().getChildren();
  if (topLevel.length !== elements.length) return;
  for (const [position, node] of topLevel.entries()) {
    const element = elements[position];
    if ($isOpaqueNode(node) && element) showAs(node.__kept, element);
  }
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
    editor.registerCommand(PASTE_COMMAND, $insertAroundOpaqueNodes, COMMAND_PRIORITY_CRITICAL),
    editor.registerCommand(CLICK_COMMAND, $selectClickedOpaqueNode, COMMAND_PRIORITY_CRITICAL)
  );
};

export function createPageEditor(
  twin: HTMLElement,
  state: VeEditorState,
  formats: VeRichTextFormats,
  events: PageEditorEvents,
  look: RenderedLook = { fixedNodes: null, theme: {} }
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
    theme: look.theme,
  });
  loadState(editor, state);
  const { fixedNodes } = look;
  if (fixedNodes) editor.getEditorState().read(() => $showFixedNodesAs(fixedNodes));
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

  const holdsItsOpaqueNodes = (
    editorState: EditorState,
    prevEditorState: EditorState,
    tags: ReadonlySet<string>
  ): boolean => {
    const held = editorState.read($keptNodes);
    if (isSameSequence(held, prevEditorState.read($keptNodes))) return true;
    const isMeant = tags.has(OPAQUE_REMOVAL_TAG) || tags.has(HISTORIC_TAG);
    return isMeant && isPartOfSequence(held, kept);
  };

  const $restoreSelection = (): void => {
    if (!lastRange) return;
    const { anchor, focus } = lastRange;
    if ($getNodeByKey(anchor.key) && $getNodeByKey(focus.key)) $setSelection(lastRange.clone());
  };

  const stopListening = mergeRegister(
    registerKeptOpaqueNodes(editor, kept),
    registerAllowedFormats(editor, formats, stylesIn(state)),
    registerRichText(editor),
    registerList(editor),
    registerHistory(editor, createEmptyHistoryState(), HISTORY_MERGE_PAUSE_MS),
    editor.registerUpdateListener(
      ({ dirtyElements, dirtyLeaves, editorState, prevEditorState, tags }) => {
        if (!holdsItsOpaqueNodes(editorState, prevEditorState, tags)) {
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
    placeCaret(position) {
      editor.update(() => $placeCaret(position), { discrete: true });
    },
    restoreSelection() {
      editor.update($restoreSelection, { discrete: true });
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
