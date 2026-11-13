import { describe, expect, it } from "vitest";

import { applyTranslations, collectTranslationTargets } from "../../../traversal/index.js";
import type { Language } from "../../../traversal/index.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { isEmpty } from "../../../core/kernel/utils/isEmpty.js";
import { isObject } from "../../../core/kernel/utils/isObject.js";
import type { ContentCrossing } from "../../contentCrossing.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";
import { PAYLOAD_LEXICAL_ID, payloadLexicalContent } from "../../payload-lexical/index.js";
import { text, tree, walkDocument } from "../../__tests__/fixtures/lexical.js";
import { sentTextOf, sentTextsOf } from "../../../traversal/__tests__/fixtures/sentText.js";

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
      ? [{ kind: "text", text: value, resolve: (translated) => [{ slot, value: translated }] }]
      : [],

  boundary: () => null,
});

const noteContent: ContentCrossing = {
  languageId: NOTE_ID,

  open: ({ value }) => {
    if (!isNote(value)) return null;
    return { context: null, workingCopy: structuredClone(value) };
  },
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

    expect(sentTextsOf(targets)).toEqual(["Shop", "Buy now", "Thanks"]);
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

    expect(sentTextsOf(collected.targets)).toEqual(["Shop", "Buy now"]);
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
      collected.targets.map((target) => `[de] ${sentTextOf(target)}`)
    );

    expect(working.notes.lines).toEqual(["[de] Buy now", "[de] Thanks"]);
    expect(source.notes.lines).toEqual(["Buy now", "Thanks"]);
  });
});

describe("a crossing entry declares the language it speaks", () => {
  it("names it without being opened, so a host can narrow its list before offering anything", () => {
    expect(payloadLexicalContent().languageId).toBe(PAYLOAD_LEXICAL_ID);
  });

  it("is the name the walk crosses by, when two languages would both take the value", () => {
    const source = document();

    // The twin accepts the same contexts and reads the same values; the only thing that tells the
    // two apart is the text it reports, so the texts name which one the walk actually entered.
    const twin: Language<number, Note> = {
      ...noteLanguage(),
      id: "note-twin",
      textUnits: ({ value, slot }) =>
        typeof value === "string" && slot !== undefined
          ? [
              {
                kind: "text",
                text: `twin:${value}`,
                resolve: (translated) => [{ slot, value: translated }],
              },
            ]
          : [],
    };
    const declaresTheTwin: ContentCrossing = { ...noteContent, languageId: "note-twin" };

    const { targets } = collectTranslationTargets({
      languages: [payloadFieldsLanguage({ crossings: [declaresTheTwin] }), noteLanguage(), twin],
      entry: {
        languageId: PAYLOAD_FIELDS_ID,
        context: { fields: schema, data: structuredClone(source), source },
      },
    });

    expect(sentTextsOf(targets)).toEqual(["Shop", "twin:Buy now", "twin:Thanks"]);
  });
});
