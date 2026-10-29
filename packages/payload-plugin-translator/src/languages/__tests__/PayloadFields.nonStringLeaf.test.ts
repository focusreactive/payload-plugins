import { describe, expect, it } from "vitest";

import type { TranslationTarget } from "../../core/traversal/index.js";
import { applyTranslations, collectTranslationTargets } from "../../core/traversal/index.js";
import { addressesOf } from "./addresses.js";
import type { FieldLike } from "../../core/kernel/field-traversal/index.js";
import { FieldChunkCollector } from "../../core/translation-pipeline/stages/field-collector/index.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";

const schema: FieldLike[] = [{ type: "text", name: "tags", localized: true }];
const source = { tags: ["one", "two"] };

describe("a selected leaf whose stored value is not a string", () => {
  it("the collector hands it over as a chunk, text and all", () => {
    const working = structuredClone(source);
    const chunks = new FieldChunkCollector(schema, working, source, ["tags"]).collect();

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.dataRef[chunks[0].key]).toEqual(["one", "two"]);
  });

  it("the language selects it and then offers no text, so the walk reports it", () => {
    const working = structuredClone(source);
    const reported: { address: string; value: unknown }[] = [];
    const targets = collectTranslationTargets({
      languages: [payloadFieldsLanguage()],
      entry: {
        languageId: PAYLOAD_FIELDS_ID,
        context: { fields: schema, data: working, source },
      },
      onSelectedWithoutText: (idPath, value) =>
        reported.push({ address: addressesOf([{ idPath } as TranslationTarget])[0] ?? "", value }),
    });

    expect(targets).toHaveLength(0);
    expect(reported).toEqual([{ address: "tags", value: ["one", "two"] }]);
  });

  it("so the value survives a walk that did reach it", () => {
    const working = structuredClone(source);
    const reached: string[] = [];
    const targets = collectTranslationTargets({
      languages: [payloadFieldsLanguage()],
      entry: {
        languageId: PAYLOAD_FIELDS_ID,
        context: { fields: schema, data: working, source },
      },
      onSelectedWithoutText: (idPath) =>
        reached.push(addressesOf([{ idPath } as TranslationTarget])[0] ?? ""),
    });

    expect(reached).toEqual(["tags"]);
    applyTranslations(
      targets,
      targets.map(() => "translated")
    );

    expect(working.tags).toEqual(["one", "two"]);
  });
});
