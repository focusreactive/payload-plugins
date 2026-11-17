import type { EditorThemeClasses } from "lexical";

import type { VeEditorState } from "../../../shared/protocol.js";
import type { RenderedLook } from "./pageEditor.js";

import { isEditableNode } from "../../../shared/richText/editableNodes.js";
import { childrenOf, rootOf } from "../../../shared/richText/editorNodes.js";
import { hasMarker, withoutMarker } from "../../../shared/stegaText.js";
import { DATA_VE_OPAQUE_ATTR } from "./opaqueNode.js";
import {
  STRIKETHROUGH_CLASS,
  UNDERLINE_CLASS,
  UNDERLINE_STRIKETHROUGH_CLASS,
} from "./pageEditor.js";

const PLACEHOLDER = `[${DATA_VE_OPAQUE_ATTR}]`;
const ID_ATTR = "id";
const ATTRS_OF_THE_OVERLAY = "data-ve-";
const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
const PARAGRAPH = "p";
const QUOTE = "blockquote";
const BULLET_LIST = "ul";
const NUMBERED_LIST = "ol";
const LIST_ITEM = "li";
const INSIDE_A_LIST_ITEM = `${LIST_ITEM} `;
const LIST_DEPTHS = 8;
const LINK = "a";
const BOLD = "strong, b";
const ITALIC = "em, i";
const CODE = "code";
const UNDERLINE = `u, .${UNDERLINE_CLASS}`;
const STRIKETHROUGH = `s, del, .${STRIKETHROUGH_CLASS}`;
const CLASSES_OF_THE_EDITOR: ReadonlySet<string> = new Set([
  UNDERLINE_CLASS,
  STRIKETHROUGH_CLASS,
  UNDERLINE_STRIKETHROUGH_CLASS,
]);

const NOTHING_RENDERED: RenderedLook = {
  fixedNodes: null,
  theme: {
    text: {
      strikethrough: STRIKETHROUGH_CLASS,
      underline: UNDERLINE_CLASS,
      underlineStrikethrough: UNDERLINE_STRIKETHROUGH_CLASS,
    },
  },
};

type Rendered = { element: Element; fixed: readonly Element[] };

const isEdited = ({ fixed }: Rendered, element: Element): boolean =>
  element.closest(PLACEHOLDER) === null && !fixed.some((shown) => shown.contains(element));

const classesOfTheSite = (element: Element | null | undefined): string =>
  [...(element?.classList ?? [])].filter((name) => !CLASSES_OF_THE_EDITOR.has(name)).join(" ");

const firstOf = (rendered: Rendered, selector: string): Element | null =>
  [...rendered.element.querySelectorAll(selector)].find((element) => isEdited(rendered, element)) ??
  null;

const classOf = (rendered: Rendered, selector: string): string =>
  classesOfTheSite(firstOf(rendered, selector));

const joined = (...classes: string[]): string => classes.filter(Boolean).join(" ");

const withoutEmpty = <Classes extends Record<string, string>>(classes: Classes): Partial<Classes> =>
  Object.fromEntries(
    Object.entries(classes).filter(([, className]) => className !== "")
  ) as Partial<Classes>;

const classesByDepth = (rendered: Rendered, list: string): string[] => {
  const outermost = classOf(rendered, list);
  const nested = firstOf(rendered, `${INSIDE_A_LIST_ITEM}${list}`);
  const inside = nested ? classesOfTheSite(nested) : outermost;
  return Array.from({ length: LIST_DEPTHS }, (_unused, depth) =>
    depth === 0 ? outermost : inside
  );
};

const themeOf = (rendered: Rendered): EditorThemeClasses => {
  const underline = classOf(rendered, UNDERLINE);
  const strikethrough = classOf(rendered, STRIKETHROUGH);
  const nestedList =
    firstOf(rendered, `${INSIDE_A_LIST_ITEM}${BULLET_LIST}`) ??
    firstOf(rendered, `${INSIDE_A_LIST_ITEM}${NUMBERED_LIST}`);
  return {
    ...withoutEmpty({
      link: classOf(rendered, LINK),
      paragraph: classOf(rendered, PARAGRAPH),
      quote: classOf(rendered, QUOTE),
    }),
    heading: withoutEmpty(
      Object.fromEntries(HEADING_TAGS.map((tag) => [tag, classOf(rendered, tag)]))
    ),
    list: {
      ...withoutEmpty({ listitem: classOf(rendered, LIST_ITEM) }),
      nested: withoutEmpty({ listitem: classesOfTheSite(nestedList?.closest(LIST_ITEM)) }),
      olDepth: classesByDepth(rendered, NUMBERED_LIST),
      ulDepth: classesByDepth(rendered, BULLET_LIST),
    },
    text: {
      ...withoutEmpty({
        bold: classOf(rendered, BOLD),
        code: classOf(rendered, CODE),
        italic: classOf(rendered, ITALIC),
      }),
      strikethrough: joined(STRIKETHROUGH_CLASS, strikethrough),
      underline: joined(UNDERLINE_CLASS, underline),
      underlineStrikethrough: joined(UNDERLINE_STRIKETHROUGH_CLASS, underline, strikethrough),
    },
  };
};

const cleanAttributes = (element: Element): void => {
  for (const name of element.getAttributeNames()) {
    const value = element.getAttribute(name) ?? "";
    if (name === ID_ATTR || name.startsWith(ATTRS_OF_THE_OVERLAY)) element.removeAttribute(name);
    else if (hasMarker(value)) element.setAttribute(name, withoutMarker(value));
  }
};

const cleanText = (copy: Element): void => {
  const texts = copy.ownerDocument.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  while (texts.nextNode()) {
    const text = texts.currentNode as Text;
    if (hasMarker(text.data)) text.data = withoutMarker(text.data);
  }
};

const copyOf = (element: Element): HTMLElement => {
  const copy = element.cloneNode(true) as HTMLElement;
  for (const part of [copy, ...copy.querySelectorAll("*")]) cleanAttributes(part);
  cleanText(copy);
  return copy;
};

const shownFor = (element: Element): HTMLElement | null => {
  const rendered = element.matches(PLACEHOLDER) ? element.firstElementChild : element;
  return rendered && copyOf(rendered);
};

const fixedElementsOf = (rendered: Element, state: VeEditorState): (Element | null)[] | null => {
  const topLevel = childrenOf(rootOf(state) ?? {});
  const elements = [...rendered.children];
  if (elements.length !== topLevel.length) return null;
  return topLevel.map((node, position) =>
    isEditableNode(node) ? null : (elements[position] as Element)
  );
};

export const lookOf = (rendered: Element | null, state: VeEditorState): RenderedLook => {
  if (!rendered) return NOTHING_RENDERED;
  const fixedElements = fixedElementsOf(rendered, state);
  const fixed = (fixedElements ?? []).flatMap((element) => element ?? []);
  return {
    fixedNodes: fixedElements && fixedElements.map((element) => element && shownFor(element)),
    theme: themeOf({ element: rendered, fixed }),
  };
};
