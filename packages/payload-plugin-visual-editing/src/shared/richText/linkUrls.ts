import type { VeEditorState } from "../protocol.js";
import type { EditorNode } from "./editorNodes.js";

import { isPlainObject } from "../plainObject.js";
import { forEachEditorNode, rootOf } from "./editorNodes.js";
import { LINK_NODE_TYPES } from "./nodeTypes.js";

const ALLOWED_SCHEMES: ReadonlySet<string> = new Set(["http:", "https:", "mailto:", "tel:"]);

const SCHEME = /^[a-z][a-z\d+.-]*:/iu;

const LAST_CHARACTER_BROWSERS_IGNORE = " ";

const withoutIgnoredCharacters = (url: string): string =>
  [...url].filter((character) => character > LAST_CHARACTER_BROWSERS_IGNORE).join("");

export const linkUrlOf = (typed: string): string => typed.trim();

export const isAllowedLinkUrl = (url: string): boolean => {
  const compact = withoutIgnoredCharacters(url);
  if (compact === "") return false;
  const scheme = SCHEME.exec(compact)?.[0];
  return scheme === undefined || ALLOWED_SCHEMES.has(scheme.toLowerCase());
};

const urlOfLink = (node: EditorNode): string | null => {
  if (!LINK_NODE_TYPES.has(node.type) || !isPlainObject(node.fields)) return null;
  const { url } = node.fields;
  return typeof url === "string" ? url : null;
};

const linkUrlsOf = (value: unknown): string[] => {
  const urls: string[] = [];
  forEachEditorNode(rootOf(value), (node) => {
    const url = urlOfLink(node);
    if (url !== null) urls.push(url);
  });
  return urls;
};

export const addsOnlyAllowedLinkUrls = (stored: unknown, state: VeEditorState): boolean => {
  const storedUrls = new Set(linkUrlsOf(stored));
  return linkUrlsOf(state).every((url) => storedUrls.has(url) || isAllowedLinkUrl(url));
};
