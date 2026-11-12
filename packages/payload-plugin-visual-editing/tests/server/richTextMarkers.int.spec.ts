import { vercelStegaDecode, vercelStegaDecodeAll, vercelStegaSplit } from "@vercel/stega";
import { describe, expect, it } from "vitest";

import type { ValueExcludePredicate } from "../../src/excludeValues";
import type { SchemaField } from "../../src/shared/editableSchema/editableSchema";

import { defaultExcludeValues } from "../../src/excludeValues";
import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { markRead } from "../../src/server/markRead";
import { markTextLeaves } from "../../src/server/richText/markTextLeaves";
import { shapeOf } from "../../src/shared/richText/shapeOf";
import { textLeavesOf } from "../../src/shared/richText/textLeaves";
import { META_KEY } from "../../src/shared/shared";
import { fieldAddressOf } from "../../src/shared/veDocument";

import { everyMarkedTextIn } from "../support/markedData";
import { paragraphsOf, textNode } from "../support/editorState";

const inPage = (docId: string) => ({ collectionSlug: "pages", docId, kind: "collection" }) as const;
const BODY_OF_A = fieldAddressOf(inPage("A"), "body");

const state = () => paragraphsOf(["Hello ", "world"], [""]);

const leafText = (value: ReturnType<typeof state>, paragraph: number, leaf: number) =>
  value.root.children[paragraph]?.children[leaf]?.text ?? "";

describe("markTextLeaves", () => {
  it("stamps each text leaf with its address and the shape of the tree", () => {
    const value = state();
    const shape = shapeOf(value, BODY_OF_A);

    markTextLeaves(value, BODY_OF_A);

    expect(vercelStegaSplit(leafText(value, 0, 1)).cleaned).toBe("world");
    expect(vercelStegaDecode(leafText(value, 0, 0))).toEqual({ node: "0.0", shape });
    expect(vercelStegaDecode(leafText(value, 0, 1))).toEqual({ node: "0.1", shape });
  });

  it("leaves empty text without a marker", () => {
    const value = state();

    markTextLeaves(value, BODY_OF_A);

    expect(leafText(value, 1, 0)).toBe("");
  });

  it("leaves a node of another type that keeps data in a text property as it is", () => {
    const mention = { text: "@ann", type: "mention", version: 1 };
    const value = {
      root: {
        children: [{ children: [textNode("Ask "), { ...mention }], type: "paragraph", version: 1 }],
        type: "root",
        version: 1,
      },
    };

    markTextLeaves(value, BODY_OF_A);

    expect(value.root.children[0]?.children[1]).toEqual(mention);
    expect(vercelStegaDecode(value.root.children[0]?.children[0]?.text ?? "")).toMatchObject({
      node: "0.0",
    });
  });

  it("computes the shape before any text is changed", () => {
    const value = state();
    const shape = shapeOf(state(), BODY_OF_A);

    markTextLeaves(value, BODY_OF_A);

    expect(vercelStegaDecode<{ shape: string }>(leafText(value, 0, 0))?.shape).toBe(shape);
  });

  it("leaves a value that is not an editor state as it is", () => {
    const value = { blocks: [{ text: "Not Lexical" }] };

    markTextLeaves(value, BODY_OF_A);

    expect(value).toEqual({ blocks: [{ text: "Not Lexical" }] });
  });
});

const pageFields = [
  { name: "title", type: "text" },
  { name: "body", type: "richText" },
  { name: "intro#draft", type: "richText" },
  { admin: { readOnly: true }, name: "lockedBody", type: "richText" },
  { hidden: true, name: "hiddenBody", type: "richText" },
  { admin: { disabled: true }, name: "disabledBody", type: "richText" },
  { admin: { hidden: true }, name: "adminHiddenBody", type: "richText" },
  { name: "tenantBody", type: "richText" },
  { name: "settings", type: "json" },
  { name: "related", relationTo: "pages", type: "relationship" },
  { fields: [{ name: "note", type: "richText" }], name: "list", type: "array" },
  {
    blocks: [{ fields: [{ name: "body", type: "richText" }], slug: "content" }],
    name: "layout",
    type: "blocks",
  },
] as SchemaField[];

const pagesSchema = buildEditableSchema(pageFields, { excludeFieldNames: ["tenantBody"] });

const NO_LOCALE_KEYS_VALUES: readonly string[] = [];
const EVERY_LOCALE = ["en", "de"];
const INSTANT_PREVIEW = true;

type DraftRead = {
  excludeValues?: readonly ValueExcludePredicate[];
  instantPreview?: boolean;
  localeCodes?: readonly string[];
};

const readAsDraft = <T extends { id: string }>(
  page: T,
  {
    excludeValues = [],
    instantPreview = INSTANT_PREVIEW,
    localeCodes = NO_LOCALE_KEYS_VALUES,
  }: DraftRead = {}
): T =>
  markRead(page, {
    identity: { collectionSlug: "pages", docId: page.id, kind: "collection" },
    excludeValues,
    instantPreview,
    localeCodesKeyingValues: localeCodes,
    schema: pagesSchema,
  });

const lexicalText = (value: string) => ({
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});

const richText = (...paragraphs: string[][]) => ({
  root: {
    children: paragraphs.map((texts) => ({
      children: texts.map(lexicalText),
      direction: null,
      format: "",
      indent: 0,
      type: "paragraph",
      version: 1,
    })),
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});

const metaOf = (value: unknown) => (value as Record<string, unknown>)[META_KEY];

describe("the rich text of a draft read with instant preview", () => {
  it("marks every text node once and addresses the field without a key outside any row", () => {
    const stored = richText(["Hello ", "world"], ["Second"]);
    const shape = shapeOf(stored, BODY_OF_A);

    const page = readAsDraft({ body: richText(["Hello ", "world"], ["Second"]), id: "A" });

    expect(textLeavesOf(page.body).map(({ text: leaf }) => vercelStegaDecodeAll(leaf))).toEqual([
      [{ node: "0.0", shape }],
      [{ node: "0.1", shape }],
      [{ node: "1.0", shape }],
    ]);
    expect(metaOf(page.body)).toEqual({ ...inPage("A"), path: "body", terminal: true });
  });

  it("states the stable key of a rich text field in a block row", () => {
    const page = readAsDraft({
      id: "A",
      layout: [{ blockType: "content", body: richText(["In a block"]), id: "row-1" }],
    });

    expect(metaOf(page.layout[0]?.body)).toEqual({
      ...inPage("A"),
      key: "layout.row-1.body",
      path: "layout.0.body",
      terminal: true,
    });
    expect(
      textLeavesOf(page.layout[0]?.body).map(({ text: leaf }) => vercelStegaDecode(leaf))
    ).toEqual([
      {
        node: "0.0",
        shape: shapeOf(richText(["In a block"]), fieldAddressOf(inPage("A"), "layout.row-1.body")),
      },
    ]);
  });

  it("states the stable key of a rich text field in an array row", () => {
    const page = readAsDraft({
      id: "A",
      list: [
        { id: "item-1", note: richText(["First"]) },
        { id: "item-2", note: richText(["Second"]) },
      ],
    });

    expect(metaOf(page.list[1]?.note)).toMatchObject({
      key: "list.item-2.note",
      path: "list.1.note",
    });
  });

  it("leaves the text nodes unmarked in a row that has no stable key", () => {
    const page = readAsDraft({ id: "A", list: [{ note: richText(["No row id"]) }] });

    expect(page.list[0]?.note).toEqual({
      ...richText(["No row id"]),
      [META_KEY]: { ...inPage("A"), path: "list.0.note", terminal: true },
    });
  });

  it("leaves the text nodes unmarked when the name of the field holds the node key separator", () => {
    const page = readAsDraft({ id: "A", "intro#draft": richText(["Intro"]) });

    expect(page["intro#draft"]).toEqual({
      ...richText(["Intro"]),
      [META_KEY]: { ...inPage("A"), path: "intro#draft", terminal: true },
    });
  });

  it("marks a text node whose value an ordinary text field would exclude", () => {
    const stored = richText(["Read the ", "terms-of-use"], ["2026-11-11"], ["Note: mind the gap"]);
    const shape = shapeOf(stored, BODY_OF_A);

    const page = readAsDraft(
      {
        body: richText(["Read the ", "terms-of-use"], ["2026-11-11"], ["Note: mind the gap"]),
        id: "A",
        title: "terms-of-use",
      },
      { excludeValues: defaultExcludeValues }
    );

    expect(page.title).toBe("terms-of-use");
    expect(textLeavesOf(page.body).map(({ text: leaf }) => vercelStegaDecode(leaf))).toEqual([
      { node: "0.0", shape },
      { node: "0.1", shape },
      { node: "1.0", shape },
      { node: "2.0", shape },
    ]);
  });

  it("leaves rich text the editor cannot change or the plugin leaves out unmarked", () => {
    const outOfReach = [
      "lockedBody",
      "hiddenBody",
      "disabledBody",
      "adminHiddenBody",
      "tenantBody",
    ];

    const page = readAsDraft({
      id: "A",
      ...Object.fromEntries(outOfReach.map((name) => [name, richText(["Out of reach"])])),
    });

    expect(everyMarkedTextIn(page)).toEqual([]);
  });

  it("leaves a value that is not an editor state untouched", () => {
    const page = readAsDraft({
      body: [{ children: [{ text: "Slate" }], type: "p" }],
      id: "A",
      settings: { root: { children: [{ text: "Json", type: "text" }], type: "root" } },
    });

    expect(everyMarkedTextIn(page)).toEqual([]);
    expect(page.body).toEqual([
      {
        children: [{ text: "Slate" }],
        [META_KEY]: { ...inPage("A"), path: "body", terminal: true },
        type: "p",
      },
    ]);
    expect(metaOf(page.settings)).toEqual({ ...inPage("A"), path: "settings", terminal: true });
  });

  it("does not mark the rich text of a populated document a second time", () => {
    const populated = readAsDraft({
      id: "B",
      layout: [{ blockType: "content", body: richText(["Populated"]), id: "row-9" }],
      title: "Linked",
    });
    const markedOnItsOwn = structuredClone(populated.layout[0]?.body);

    const page = readAsDraft({ id: "A", related: populated, title: "Home" });

    expect(page.related.layout[0]?.body).toEqual(markedOnItsOwn);
  });

  it("binds the shape to the document and the field the text nodes belong to", () => {
    const sameTree = () => richText(["Same"]);

    const linked = readAsDraft({ body: sameTree(), id: "B" });
    const page = readAsDraft({
      body: sameTree(),
      id: "A",
      list: [{ id: "item-1", note: sameTree() }],
      related: linked,
    });

    const shapesOf = (value: unknown) =>
      textLeavesOf(value).map(
        ({ text: leaf }) => vercelStegaDecode<{ shape: string }>(leaf)?.shape
      );
    expect(shapesOf(page.body)).toEqual([shapeOf(sameTree(), BODY_OF_A)]);
    expect(shapesOf(page.related.body)).toEqual([
      shapeOf(sameTree(), fieldAddressOf(inPage("B"), "body")),
    ]);
    expect(shapesOf(page.list[0]?.note)).toEqual([
      shapeOf(sameTree(), fieldAddressOf(inPage("A"), "list.item-1.note")),
    ]);
    expect(new Set([page.body, page.related.body, page.list[0]?.note].flatMap(shapesOf)).size).toBe(
      3
    );
  });

  it("writes no marker and no key without instant preview", () => {
    const page = readAsDraft(
      {
        body: richText(["Top"]),
        id: "A",
        layout: [{ blockType: "content", body: richText(["In a block"]), id: "row-1" }],
      },
      { instantPreview: false }
    );

    expect(page.body).toEqual({
      ...richText(["Top"]),
      [META_KEY]: { ...inPage("A"), path: "body", terminal: true },
    });
    expect(page.layout[0]?.body).toEqual({
      ...richText(["In a block"]),
      [META_KEY]: { ...inPage("A"), path: "layout.0.body", terminal: true },
    });
  });

  it("writes no marker and no key in a read with every locale", () => {
    const page = readAsDraft(
      { id: "A", layout: [{ blockType: "content", body: richText(["In a block"]), id: "row-1" }] },
      { localeCodes: EVERY_LOCALE }
    );

    expect(page.layout[0]?.body).toEqual({
      ...richText(["In a block"]),
      [META_KEY]: { ...inPage("A"), path: "layout.0.body", terminal: true },
    });
  });
});
