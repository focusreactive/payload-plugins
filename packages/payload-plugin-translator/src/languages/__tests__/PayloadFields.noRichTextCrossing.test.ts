import { describe, expect, it, vi } from "vitest";

import { collectTranslationTargets } from "../../core/traversal/index.js";
import type { FieldLike } from "../../core/kernel/field-traversal/index.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";

const schema: FieldLike[] = [
  { type: "text", name: "title", localized: true },
  { type: "richText", name: "body", localized: true },
];

const document = () => ({
  title: "Hello",
  body: { root: { type: "root", children: [{ type: "text", text: "Prose" }] } },
});

describe("rich text, with no crossing configured", () => {
  it("declares no boundary, so nothing is handed to another language", () => {
    const language = payloadFieldsLanguage();
    const richTextField = schema[1] as FieldLike;

    expect(language.boundary(richTextField, { data: {}, source: {} }, document().body)).toBeNull();
  });

  it("reports the field rather than dropping it, and still collects its siblings", () => {
    const onSelectedWithoutText = vi.fn();
    const source = document();

    const targets = collectTranslationTargets({
      languages: [payloadFieldsLanguage()],
      entry: {
        languageId: PAYLOAD_FIELDS_ID,
        context: { fields: schema, data: document(), source },
      },
      onSelectedWithoutText,
    });

    expect(targets.map((target) => target.text)).toEqual(["Hello"]);
    expect(onSelectedWithoutText).toHaveBeenCalledTimes(1);
    expect(onSelectedWithoutText.mock.calls[0]?.[0]).toEqual(["body"]);
  });
});
