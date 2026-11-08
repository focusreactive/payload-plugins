import { describe, expect, it } from "vitest";

import { payloadLexicalLanguage } from "../PayloadLexical.language.js";
import { claimsNothing } from "../../__tests__/fixtures/lexical.js";

const cursor = { embed: claimsNothing, position: () => 0 };

describe("a language resolves a translation without performing it", () => {
  it("leaves the node untouched and names where the answer goes", () => {
    const node = { type: "text", text: "Buy now" };
    const language = payloadLexicalLanguage();

    const step = language.step(node, cursor);
    if (step.kind !== "value") throw new Error("a text node is a value position");
    const units = language.textUnits({ value: step.value, slot: step.slot });
    const writes = units[0]?.resolve("Jetzt kaufen");

    expect(node.text).toBe("Buy now");
    expect(writes).toEqual([{ slot: { holder: node, key: "text" }, value: "Jetzt kaufen" }]);
    expect(writes?.[0]?.slot.holder).toBe(node);
  });
});
