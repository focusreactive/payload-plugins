import { describe, expect, it } from "vitest";

import { CannotEnterLanguageError, collectTranslationTargets } from "../../traversal/index.js";
import type { BlockLike, FieldLike } from "../../core/kernel/field-traversal/index.js";
import { TranslatorBug } from "../../core/errors/index.js";
import { isObject } from "../../core/kernel/utils/isObject.js";
import { isPathSegment } from "../../core/domain/content-projection/idPath.js";
import { walkAddress } from "../../core/domain/content-projection/walkAddress.js";
import type { ContentCrossing } from "../../languages/contentCrossing.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../../languages/payload-fields/index.js";
import { PAYLOAD_LEXICAL_ID } from "../../languages/payload-lexical/index.js";
import { addressOf, addressesOf } from "../../languages/__tests__/addresses.js";
import { translationLanguages } from "../../server/features/_lib/index.js";

const quoted: BlockLike = {
  slug: "c.d",
  fields: [{ type: "text", name: "heading", localized: true }],
};

const schema: FieldLike[] = [
  { type: "text", name: "a.b", localized: true },
  { type: "blocks", name: "items", localized: true, blocks: [quoted] },
];

const document = {
  "a.b": "a dotted field name",
  items: [{ id: "x.y", blockType: "c.d", heading: "a dotted id and a dotted type" }],
};

const addressesIn = (doc: Record<string, unknown>) => {
  const payload = translationLanguages();
  return addressesOf(
    collectTranslationTargets({
      languages: payload.languages,
      entry: {
        languageId: payload.hostLanguageId,
        context: { fields: schema, data: doc, source: doc },
      },
    }).targets
  );
};

describe("the characters that separate an address survive the walk that built it", () => {
  it("escapes them in a field name, in a stored element id and in a block type", () => {
    expect(addressesIn(document)).toEqual(["a\\.b", "items.x\\.y:c\\.d.heading"]);
  });
});

describe("a part the plugin cannot read is refused where the address is written", () => {
  it.each([
    ["a bare string, as a language would emit if it wrote the address itself", "body"],
    ["a bare number, which once became a position", 0],
    ["a kind nobody declared", { kind: "slot", name: "body" }],
    ["a key with no name", { kind: "key" }],
    ["an element whose id is not a string", { kind: "element", id: 7 }],
    ["an element whose block type is not a string", { kind: "element", id: "b1", blockType: 7 }],
    ["an index that is not a number", { kind: "index", index: "0" }],
    ["nothing at all", null],
  ])("refuses %s", (_label, token) => {
    expect(isPathSegment(token)).toBe(false);
    expect(() => walkAddress([token])).toThrow(TranslatorBug);
  });

  it.each([
    ["a key", { kind: "key", name: "body" }, "body"],
    ["an element", { kind: "element", id: "b1" }, "b1"],
    ["an element with a block type", { kind: "element", id: "b1", blockType: "cta" }, "b1:cta"],
    [
      "an element with no block type named",
      { kind: "element", id: "b1", blockType: undefined },
      "b1",
    ],
    ["a position", { kind: "index", index: 2 }, "#2"],
  ])("accepts %s", (_label, token, written) => {
    expect(isPathSegment(token)).toBe(true);
    expect(addressOf([token])).toBe(written);
  });

  it("names what arrived, so the language that sent it can be found", () => {
    expect(() => walkAddress([{ kind: "slot" }])).toThrow(/kind "slot"/u);
  });
});

const refusingCrossing: ContentCrossing = {
  languageId: PAYLOAD_LEXICAL_ID,
  open: ({ value }) => (isObject(value) ? { context: { not: "a rich-text context" } } : null),
};

const refusedAt = (): CannotEnterLanguageError => {
  const body: FieldLike[] = [{ type: "richText", name: "body", localized: true }];
  try {
    collectTranslationTargets({
      languages: [
        payloadFieldsLanguage({ crossings: [refusingCrossing] }),
        ...translationLanguages().languages.filter((each) => each.id === PAYLOAD_LEXICAL_ID),
      ],
      entry: {
        languageId: PAYLOAD_FIELDS_ID,
        context: { fields: body, data: { body: { root: {} } }, source: { body: { root: {} } } },
      },
    });
  } catch (error) {
    if (error instanceof CannotEnterLanguageError) return error;
    throw error;
  }
  throw new Error("the crossing was expected to be refused");
};

describe("an error raised mid-walk says where it happened", () => {
  it("dumps the parts of the path it was carrying", () => {
    const error = refusedAt();

    expect(error).toBeInstanceOf(CannotEnterLanguageError);
    expect(error.message).toContain('at {"kind":"key","name":"body"}');
  });

  it("carries the parts themselves, which the plugin can write as an address", () => {
    const error = refusedAt();

    expect(addressOf(error.idPath)).toBe("body");
  });
});
