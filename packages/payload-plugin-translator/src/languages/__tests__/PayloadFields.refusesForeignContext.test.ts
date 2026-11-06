import { describe, expect, it } from "vitest";

import { CannotEnterLanguageError, collectTranslationTargets } from "../../core/traversal/index.js";
import type { FieldLike } from "../../core/kernel/field-traversal/index.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";

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

    const targets = walk({ fields: schema, data: { ...document }, source: document });

    expect(targets.map((target) => target.text)).toEqual(["Hello"]);
  });

  it.each([
    ["no field list at all", { data: {}, source: {} }],
    ["a field list that is not a list", { fields: "nope", data: {}, source: {} }],
    ["no document to write into", { fields: schema, source: {} }],
    ["no document to read from", { fields: schema, data: {} }],
  ])("refuses a context with %s", (_label, context) => {
    const error = thrownBy(() => walk(context));

    expect(error).toBeInstanceOf(CannotEnterLanguageError);
    expect((error as CannotEnterLanguageError).languageId).toBe(PAYLOAD_FIELDS_ID);
  });
});
