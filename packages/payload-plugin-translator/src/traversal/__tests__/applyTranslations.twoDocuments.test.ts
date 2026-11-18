import { describe, expect, it } from "vitest";
import { applyTranslations, collectTranslationTargets } from "../collect.js";
import { LEXICAL_ID, lexicalLanguage } from "./fixtures/lexical.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "./fixtures/payloadFields.js";
import { embedOf, lexicalPost, postsSchema } from "./fixtures/harness.js";
import { sentTextOf } from "./fixtures/sentText.js";

describe("two documents, not one", () => {
  it("reads the source's own text and writes only into the target", () => {
    const source = lexicalPost();
    const target = lexicalPost();

    const collected = collectTranslationTargets({
      languages: [payloadFieldsLanguage(), lexicalLanguage()],
      entry: {
        languageId: PAYLOAD_FIELDS_ID,
        context: { fields: postsSchema(LEXICAL_ID), source, target },
      },
    });
    applyTranslations(
      collected,
      collected.targets.map((t) => `<${sentTextOf(t)}>`)
    );

    expect(embedOf(target)?.heading).toBe("<Click me>");
    expect(embedOf(source)?.heading).toBe("Click me");
  });
});
