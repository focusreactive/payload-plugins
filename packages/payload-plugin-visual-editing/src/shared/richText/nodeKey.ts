import { isPlainObject } from "../plainObject.js";

const RICH_TEXT_NODE_SEPARATOR = "#";

export type RichTextNodeAddress = { address: string; fieldKey: string; shape: string };

export type RichTextNodeMarker = { node: string; shape: string };

export const isRichTextNodeKey = (key: string): boolean => key.includes(RICH_TEXT_NODE_SEPARATOR);

export const fieldKeyOfRichTextNode = (key: string): string | null =>
  isRichTextNodeKey(key) ? (key.split(RICH_TEXT_NODE_SEPARATOR)[0] ?? null) : null;

export const richTextNodeKeyOf = ({ address, fieldKey, shape }: RichTextNodeAddress): string =>
  [fieldKey, shape, address].join(RICH_TEXT_NODE_SEPARATOR);

export const toRichTextNodeMarker = (address: string, shape: string): string =>
  [shape, address].join(RICH_TEXT_NODE_SEPARATOR);

const nodeMarkerOfText = (payload: string): RichTextNodeMarker | null => {
  const [shape, node, ...rest] = payload.split(RICH_TEXT_NODE_SEPARATOR);
  return shape && node && rest.length === 0 ? { node, shape } : null;
};

export const fromRichTextNodeMarker = (payload: unknown): RichTextNodeMarker | null => {
  if (typeof payload === "string") return nodeMarkerOfText(payload);
  if (!isPlainObject(payload)) return null;
  const { node, shape } = payload;
  return typeof node === "string" && typeof shape === "string" ? { node, shape } : null;
};
