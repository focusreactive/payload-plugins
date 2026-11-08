import { describe, expect, it } from "vitest";

import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import type { Language } from "../../../core/traversal/index.js";
import {
  CannotEnterLanguageError,
  TooManyCrossingsError,
  applyTranslations,
  collectTranslationTargets,
} from "../../../core/traversal/index.js";
import type { ContentCrossing } from "../../contentCrossing.js";
import { payloadLexicalContent, payloadLexicalLanguage } from "../../payload-lexical/index.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";
import type { Tree } from "../../__tests__/fixtures/lexical.js";
import { dig, text, tree } from "../../__tests__/fixtures/lexical.js";
import { sentTextsOf } from "../../../core/traversal/__tests__/fixtures/sentText.js";

type Body = { body: Tree };

const schema: FieldLike[] = [{ type: "richText", name: "body", localized: true }];

const english = (): Body => ({ body: tree(text("Buy now")) });

const german = (): Body => ({ body: tree(text("Jetzt kaufen")) });

const walk = (working: Body, maxCrossings?: number) =>
  collectTranslationTargets({
    languages: [
      payloadFieldsLanguage({ crossings: [payloadLexicalContent()] }),
      payloadLexicalLanguage(),
    ],
    entry: {
      languageId: PAYLOAD_FIELDS_ID,
      context: { fields: schema, data: working, source: english() },
    },
    maxCrossings,
  });

const textOf = (document: Body): unknown => dig(document, "body", "root", "children", 0, "text");

describe("collecting translation targets", () => {
  it("leaves the target document exactly as it found it", () => {
    const working = german();
    const before = working.body;
    const snapshot = structuredClone(working);

    walk(working);

    expect(working.body).toBe(before);
    expect(working).toEqual(snapshot);
  });

  it("finds the text behind the crossing all the same", () => {
    expect(sentTextsOf(walk(german()).targets)).toEqual(["Buy now"]);
  });
});

describe("applying what a walk collected", () => {
  it("puts the translated tree where the document keeps it", () => {
    const working = german();

    const collected = walk(working);
    applyTranslations(collected, ["Jetzt kaufen!"]);

    expect(textOf(working)).toBe("Jetzt kaufen!");
  });

  it("stores the very tree the answers were written into, not a copy of it", () => {
    const working = german();

    const collected = walk(working);
    applyTranslations(collected, ["Jetzt kaufen!"]);

    expect(working.body).toBe(collected.placements[0]?.value);
  });

  it("stores the tree made from the source even when no answer is given", () => {
    const working = german();

    const collected = walk(working);
    applyTranslations(collected, []);

    expect(working.body).toBe(collected.placements[0]?.value);
    expect(textOf(working)).toBe("Buy now");
  });
});

const refuses: Language<never, never> = {
  id: "refuses",
  enter: () => null,
  step: () => ({ kind: "skip" }),
  selects: () => false,
  isEmpty: () => true,
  textUnits: () => [],
  boundary: () => null,
};

const handsOver: ContentCrossing = {
  languageId: "refuses",
  open: ({ value }) => ({ context: {}, workingCopy: structuredClone(value) }),
};

describe("a walk that does not finish", () => {
  it("leaves the stored value alone when the receiving language refuses its context", () => {
    const working = german();
    const before = working.body;

    expect(() =>
      collectTranslationTargets({
        languages: [payloadFieldsLanguage({ crossings: [handsOver] }), refuses],
        entry: {
          languageId: PAYLOAD_FIELDS_ID,
          context: { fields: schema, data: working, source: english() },
        },
      })
    ).toThrow(CannotEnterLanguageError);

    expect(working.body).toBe(before);
    expect(textOf(working)).toBe("Jetzt kaufen");
  });

  it("leaves the stored value alone when the crossing budget is spent", () => {
    const working = german();
    const before = working.body;

    expect(() => walk(working, 0)).toThrow(TooManyCrossingsError);

    expect(working.body).toBe(before);
    expect(textOf(working)).toBe("Jetzt kaufen");
  });
});
