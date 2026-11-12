import { isPlainObject } from "../plainObject.js";

const RICH_TEXT_NODE_SEPARATOR = "#";

export type RichTextNodeAddress = { address: string; fieldKey: string; shape: string };

export type RichTextNodeMarker = { node: string; shape: string };

export const isRichTextNodeKey = (key: string): boolean => key.includes(RICH_TEXT_NODE_SEPARATOR);

export const richTextNodeKeyOf = ({ address, fieldKey, shape }: RichTextNodeAddress): string =>
  [fieldKey, shape, address].join(RICH_TEXT_NODE_SEPARATOR);

export const toRichTextNodeMarker = (address: string, shape: string): RichTextNodeMarker => ({
  node: address,
  shape,
});

export const fromRichTextNodeMarker = (decoded: unknown): RichTextNodeMarker | null => {
  if (!isPlainObject(decoded)) return null;
  const { node, shape } = decoded;
  return typeof node === "string" && typeof shape === "string" ? { node, shape } : null;
};
