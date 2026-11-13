import type { Payload } from "payload";

import { vercelStegaDecodeAll, vercelStegaSplit } from "@vercel/stega";

import { textLeavesOf } from "../../src/shared/richText/textLeaves";

import { valueAt } from "./markedData";
import { richText } from "./realPayload";

const FIRST_TEXT_NODE = "root.children.0.children.0.text";

export const page = (docId: string) =>
  ({ collectionSlug: "pages", docId, kind: "collection" }) as const;

export const topLevelTypesOf = (content: unknown) =>
  (valueAt(content, "root.children") as { type: string }[]).map(({ type }) => type);

export const textOf = (document: unknown, richTextPath: string) =>
  valueAt(document, `${richTextPath}.${FIRST_TEXT_NODE}`);

const element = (type: string, children: object[], extra: object = {}) => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  type,
  version: 1,
  ...extra,
});

const textNode = (text: string, format = 0) => ({
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text,
  type: "text",
  version: 1,
});

const BOLD = 1;

export const ARTICLE_TEXT_NODES = [
  { address: "0.0", text: "Hello " },
  { address: "0.1", text: "world" },
  { address: "1.0", text: "Read " },
  { address: "1.1.0", text: "the docs" },
  { address: "1.2", text: " first" },
  { address: "2.0.0", text: "One" },
  { address: "2.1.0", text: "Two" },
];

export const article = () => ({
  root: element("root", [
    element("paragraph", [textNode("Hello "), textNode("world", BOLD)], { textFormat: 0 }),
    element(
      "paragraph",
      [
        textNode("Read "),
        element("link", [textNode("the docs")], {
          fields: { linkType: "custom", newTab: false, url: "https://example.com/docs" },
        }),
        textNode(" first"),
      ],
      { textFormat: 0 }
    ),
    element(
      "list",
      [
        element("listitem", [textNode("One")], { value: 1 }),
        element("listitem", [textNode("Two")], { value: 2 }),
      ],
      { listType: "bullet", start: 1, tag: "ul" }
    ),
  ]),
});

export type Pages = { article: string; landing: string; linked: string };

export const seedPages = async (payload: Payload): Promise<Pages> => {
  const linked = await payload.create({
    collection: "pages",
    data: { body: richText("Linked body"), title: "Linked" },
    draft: true,
  });
  const landing = await payload.create({
    collection: "pages",
    data: {
      body: richText("Body"),
      layout: [
        { blockType: "hero", body: richText("Block body"), heading: "Welcome" },
        { blockType: "hero", body: richText("Second block body"), heading: "Again" },
      ],
      list: [
        { label: "First", note: richText("Row note") },
        { label: "Second", note: richText("Second row note") },
      ],
      localizedBody: richText("Localized body"),
      related: linked.id,
      title: "Landing",
    },
    draft: true,
  });
  const longRead = await payload.create({
    collection: "pages",
    data: { body: article(), title: "Article" },
    draft: true,
  });
  await payload.updateGlobal({ data: { footnote: article() }, slug: "settings" });
  return { article: String(longRead.id), landing: String(landing.id), linked: String(linked.id) };
};

export const nodeMarkersOf = (richTextValue: unknown) =>
  textLeavesOf(richTextValue).map(({ address, text }) => ({
    address,
    markers: vercelStegaDecodeAll(text) ?? [],
    text: vercelStegaSplit(text).cleaned,
  }));

export const readMarked = (payload: Payload, id: string, depth = 0) =>
  payload.findByID({ collection: "pages", depth, draft: true, id });

export const readStored = (payload: Payload, id: string) =>
  payload.findByID({
    collection: "pages",
    context: { visualEditing: false },
    depth: 0,
    draft: true,
    id,
  });
