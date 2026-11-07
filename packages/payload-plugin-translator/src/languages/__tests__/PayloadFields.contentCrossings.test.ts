import { describe, expect, it } from "vitest";

import { applyTranslations, collectTranslationTargets } from "../../core/traversal/index.js";
import type { Language } from "../../core/traversal/index.js";
import type { FieldLike } from "../../core/kernel/field-traversal/index.js";
import { isEmpty } from "../../core/kernel/utils/isEmpty.js";
import { isObject } from "../../core/kernel/utils/isObject.js";
import type { ContentCrossing } from "../contentCrossing.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";
import { text, tree, walkDocument } from "./fixtures/lexical.js";

const NOTE_ID = "note";

type Note = { lines: string[] };

const isNote = (value: unknown): value is Note =>
  isObject(value) && Array.isArray(value.lines) && value.lines.every((l) => typeof l === "string");

const noteLanguage = (): Language<number, Note> => ({
  id: NOTE_ID,

  enter({ value }) {
    if (!isNote(value)) return null;
    return { nodes: value.lines.map((_, index) => index), cursor: value };
  },

  step(node, cursor) {
    return {
      kind: "value",
      value: cursor.lines[node],
      segments: [node],
      slot: { holder: cursor.lines, key: node },
    };
  },

  selects: () => true,
  isEmpty,

  textUnits: ({ value, slot }) =>
    typeof value === "string" && slot !== undefined
      ? [{ text: value, resolve: (translated) => [{ slot, value: translated }] }]
      : [],

  boundary: () => null,
});

const noteContent: ContentCrossing = ({ value }) => {
  if (!isNote(value)) return null;
  return { languageId: NOTE_ID, context: null, workingCopy: structuredClone(value) };
};

const schema: FieldLike[] = [
  { type: "text", name: "title", localized: true },
  { type: "json", name: "notes", localized: true },
  { type: "json", name: "config", localized: true },
];

type Shop = { title: string; notes: Note; config: { retries: number } };

const document = (): Shop => ({
  title: "Shop",
  notes: { lines: ["Buy now", "Thanks"] },
  config: { retries: 3 },
});

const walk = (source: Shop, working: Shop = structuredClone(source)) =>
  collectTranslationTargets({
    languages: [payloadFieldsLanguage({ crossings: [noteContent] }), noteLanguage()],
    entry: { languageId: PAYLOAD_FIELDS_ID, context: { fields: schema, data: working, source } },
  });

describe("a host's content crossings", () => {
  it("hands over a format the host language has never heard of, on a field type it does not translate", () => {
    const { targets } = walk(document());

    expect(targets.map((target) => target.text)).toEqual(["Shop", "Buy now", "Thanks"]);
  });

  it("addresses the pieces of that format under the field that held it", () => {
    const { targets } = walk(document());

    expect(targets.map((target) => target.idPath.join("."))).toEqual([
      "title",
      "notes.0",
      "notes.1",
    ]);
  });

  it("offers a field of a type the package does not translate, when a format claims the value", () => {
    const source = { title: "Shop", notes: tree(text("Buy now")), config: { retries: 3 } };

    const { collected } = walkDocument({ schema, source });

    expect(collected.targets.map((target) => target.text)).toEqual(["Shop", "Buy now"]);
  });

  it("leaves a value no crossing recognises to the host's own rules", () => {
    const { targets } = walk(document());

    expect(targets.some((target) => target.idPath.includes("config"))).toBe(false);
  });

  it("writes answers back through the crossing, into the working copy only", () => {
    const source = document();
    const working = structuredClone(source);

    const collected = walk(source, working);
    applyTranslations(
      collected,
      collected.targets.map((target) => `[de] ${target.text}`)
    );

    expect(working.notes.lines).toEqual(["[de] Buy now", "[de] Thanks"]);
    expect(source.notes.lines).toEqual(["Buy now", "Thanks"]);
  });
});
