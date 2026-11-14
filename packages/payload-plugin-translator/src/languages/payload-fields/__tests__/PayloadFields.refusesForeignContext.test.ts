import { describe, expect, it } from "vitest";

import { CannotEnterLanguageError, collectTranslationTargets } from "../../../traversal/index.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";
import { sentTextsOf } from "../../../traversal/__tests__/fixtures/sentText.js";

const schema: FieldLike[] = [{ type: "text", name: "title", localized: true }];

const walk = (context: unknown) =>
  collectTranslationTargets({
    languages: [payloadFieldsLanguage()],
    entry: { languageId: PAYLOAD_FIELDS_ID, context },
  });

const thrownBy = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("nothing was thrown");
};

describe("the field language and the context it is handed", () => {
  it("walks a context carrying a field list and both documents", () => {
    const document = { title: "Hello" };

    const { targets } = walk({ fields: schema, data: { ...document }, source: document });

    expect(sentTextsOf(targets)).toEqual(["Hello"]);
  });

  it.each<[string, unknown]>([
    ["no field list at all", { data: {}, source: {} }],
    ["a field list that is not a list", { fields: "nope", data: {}, source: {} }],
    ["no document to write into", { fields: schema, source: {} }],
    ["no document to read from", { fields: schema, data: {} }],
    ["nothing at all", null],
    ["nothing at all, the other way", undefined],
  ])("refuses a context with %s", (_label, context) => {
    const error = thrownBy(() => walk(context));

    expect(error).toBeInstanceOf(CannotEnterLanguageError);
    expect((error as CannotEnterLanguageError).languageId).toBe(PAYLOAD_FIELDS_ID);
  });

  it("calls an absent context a refusal, not a language that broke", () => {
    // The two are told apart by `cause`, and nothing is wrong with the language when it is handed
    // nothing: there is no context here that could be its own.
    const error = thrownBy(() => walk(null));

    expect("cause" in (error as object)).toBe(false);
  });
});
