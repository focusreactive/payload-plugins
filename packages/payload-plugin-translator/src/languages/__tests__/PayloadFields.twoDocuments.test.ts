import { describe, expect, it } from "vitest";

import { applyTranslations, collectTranslationTargets } from "../../core/traversal/index.js";
import type { FieldLike } from "../../core/kernel/field-traversal/index.js";
import { addressesOf } from "./addresses.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";

const schema: FieldLike[] = [
  { type: "text", name: "title", localized: true },
  { type: "text", name: "dropped", localized: true },
  {
    type: "array",
    name: "items",
    fields: [{ type: "text", name: "label", localized: true }],
  },
];

const walk = (data: Record<string, unknown>, source: Record<string, unknown>) =>
  collectTranslationTargets({
    languages: [payloadFieldsLanguage()],
    entry: { languageId: PAYLOAD_FIELDS_ID, context: { fields: schema, data, source } },
  });

describe("the two documents are not interchangeable", () => {
  it("reads the text from the source, not from the copy being written", () => {
    const source = { title: "from the source", items: [] };
    const data = { title: "from the copy", items: [] };

    expect(walk(data, source).map((target) => target.text)).toEqual(["from the source"]);
  });

  it("writes into the copy and leaves the source untouched", () => {
    const source = { title: "Hello", items: [] };
    const data = { title: "Hello", items: [] };

    const targets = walk(data, source);
    applyTranslations(targets, ["translated"]);

    expect(data.title).toBe("translated");
    expect(source.title).toBe("Hello");
  });

  it("walks what the working copy holds, whatever the source carries", () => {
    const source = { title: "Kept", dropped: "gone", items: [] };
    const data = { title: "Kept", items: [] };

    expect(walk(data, source).map((target) => target.text)).toEqual(["Kept"]);
  });

  it("addresses a list element by the source element's id, not the copy's", () => {
    const source = { title: "T", items: [{ id: "from-source", label: "Label" }] };
    const data = { title: "T", items: [{ id: "from-copy", label: "Label" }] };

    expect(addressesOf(walk(data, source))).toEqual(["title", "items.from-source.label"]);
  });
});
