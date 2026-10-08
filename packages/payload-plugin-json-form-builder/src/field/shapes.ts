import type { ArrayNode, Container, Leaf, TypedNode } from "./typedJson.js";

type Over<T> = Partial<Omit<T, "type" | "name">>;

const leaf =
  <T extends Leaf["type"]>(type: T, blank: unknown) =>
  (name: string, over: Over<Leaf> = {}): Leaf => ({ name, type, value: blank, ...over });

export const text = leaf("text", "");
export const textarea = leaf("textarea", "");
export const richText = leaf("richText", "");
export const upload = leaf("upload", "");
export const number = leaf("number", null);
export const date = leaf("date", null);
export const checkbox = leaf("checkbox", false);

const chosen =
  (type: "select" | "radio") =>
  (name: string, options: string[], over: Over<Leaf> = {}): Leaf => ({
    name,
    type,
    value: "",
    options,
    ...over,
  });

export const select = chosen("select");
export const radio = chosen("radio");

const held =
  (type: "group" | "collapsible") =>
  (name: string, fields: TypedNode[], over: Over<Container> = {}): Container => ({
    name,
    type,
    fields,
    ...over,
  });

export const group = held("group");
export const collapsible = held("collapsible");

export const array = (
  name: string,
  fields: TypedNode[],
  over: Over<ArrayNode> = {}
): ArrayNode => ({
  name,
  type: "array",
  fields,
  rows: [],
  ...over,
});
