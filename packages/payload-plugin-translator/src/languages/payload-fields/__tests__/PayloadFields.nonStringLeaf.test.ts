import { describe, expect, it } from "vitest";

import { applyTranslations, collectTranslationTargets } from "../../../traversal/index.js";
import { addressOf } from "../../__tests__/addresses.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";

const schema: FieldLike[] = [{ type: "text", name: "tags", localized: true }];
const source = { tags: ["one", "two"] };

describe("a selected leaf whose stored value is not a string", () => {
  it("the language selects it and then offers no text, so the walk reports it", () => {
    const working = structuredClone(source);
    const reported: { address: string; value: unknown }[] = [];
    const { targets } = collectTranslationTargets({
      languages: [payloadFieldsLanguage()],
      entry: {
        languageId: PAYLOAD_FIELDS_ID,
        context: { fields: schema, data: working, source },
      },
      onSelectedWithoutText: (idPath, value) =>
        reported.push({ address: addressOf(idPath), value }),
    });

    expect(targets).toHaveLength(0);
    expect(reported).toEqual([{ address: "tags", value: ["one", "two"] }]);
  });

  it("so the value survives a walk that did reach it", () => {
    const working = structuredClone(source);
    const reached: string[] = [];
    const collected = collectTranslationTargets({
      languages: [payloadFieldsLanguage()],
      entry: {
        languageId: PAYLOAD_FIELDS_ID,
        context: { fields: schema, data: working, source },
      },
      onSelectedWithoutText: (idPath) => reached.push(addressOf(idPath)),
    });

    expect(reached).toEqual(["tags"]);
    applyTranslations(
      collected,
      collected.targets.map(() => "translated")
    );

    expect(working.tags).toEqual(["one", "two"]);
  });
});
