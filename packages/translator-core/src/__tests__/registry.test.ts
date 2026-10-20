import { describe, expect, it } from "vitest";

import { collectTranslationTargets } from "../collect.js";
import { DuplicateLanguageError, UnknownLanguageError } from "../errors/index.js";
import type { FieldLike } from "./fixtures/payloadFields.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "./fixtures/payloadFields.js";

const schema: FieldLike[] = [{ type: "text", name: "title", localized: true }];
const document = () => ({ title: "Hello" });

describe("the registry", () => {
  it("refuses an entry naming a language it does not hold", () => {
    expect(() =>
      collectTranslationTargets({
        languages: [payloadFieldsLanguage()],
        entry: { languageId: "nobody", context: {} },
      })
    ).toThrow(UnknownLanguageError);
  });

  it("names what it does hold, so a typo is diagnosable", () => {
    let thrown: unknown;
    try {
      collectTranslationTargets({
        languages: [payloadFieldsLanguage()],
        entry: { languageId: "payload-field", context: {} },
      });
    } catch (error) {
      thrown = error;
    }

    expect((thrown as UnknownLanguageError).known).toEqual([PAYLOAD_FIELDS_ID]);
  });

  it("refuses two languages under one id, since a crossing could not say which", () => {
    expect(() =>
      collectTranslationTargets({
        languages: [payloadFieldsLanguage(), payloadFieldsLanguage()],
        entry: {
          languageId: PAYLOAD_FIELDS_ID,
          context: { fields: schema, source: document(), target: document() },
        },
      })
    ).toThrow(DuplicateLanguageError);
  });
});
