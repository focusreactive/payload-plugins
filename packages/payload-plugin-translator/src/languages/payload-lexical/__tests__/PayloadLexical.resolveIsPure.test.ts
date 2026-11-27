import { describe, expect, it } from "vitest";

import { claimsNothing, paragraph, text } from "../../__tests__/fixtures/lexical.js";
import type { Node } from "../../__tests__/fixtures/lexical.js";
import type { LexicalCursor } from "../PayloadLexical.language.js";
import { payloadLexicalLanguage } from "../PayloadLexical.language.js";

const cursor: LexicalCursor = { embed: claimsNothing, position: () => 0 };

const bolded = (value: string) => ({ ...text(value), format: 1 });

const piecesUnitFor = (container: Node) => {
  const language = payloadLexicalLanguage();
  const step = language.step(container, cursor);
  if (step.kind !== "value") throw new Error("a container is a value position");
  const unit = language.textUnits({ value: step.value, slot: step.slot })[0];
  if (unit?.kind !== "pieces") throw new Error("a container of runs is cut into pieces");
  return unit;
};

describe("a language resolves a translation without performing it", () => {
  it("leaves the container untouched and names where every answer goes", () => {
    const before = text("a ");
    const bold = bolded("red");
    const after = text(" car");
    const container = paragraph(before, bold, after);

    const writes = piecesUnitFor(container).resolve([
      { id: 1, text: "une " },
      { id: 3, text: "voiture " },
      { id: 2, text: "rouge" },
    ]);

    expect(before.text).toBe("a ");
    expect(bold.text).toBe("red");
    expect(container.children).toEqual([before, bold, after]);

    expect(writes).toContainEqual({ slot: { holder: before, key: "text" }, value: "une " });
    expect(writes).toContainEqual({ slot: { holder: bold, key: "text" }, value: "rouge" });
    expect(writes.at(-1)).toEqual({
      slot: { holder: container, key: "children" },
      value: [before, after, bold],
    });
  });

  it("describes nothing at all when the answer does not match what was sent", () => {
    const unit = piecesUnitFor(paragraph(text("a "), bolded("red"), text(" car")));

    expect(unit.resolve([{ id: 1, text: "une " }])).toEqual([]);
    expect(unit.resolve([{ id: 9, text: "qui?" }])).toEqual([]);
  });

  it("refuses a piece answered as carrying nothing when it was sent carrying text", () => {
    const container = paragraph(text("a "), bolded("red"), text(" car"));

    expect(
      piecesUnitFor(container).resolve([
        { id: 1, text: "une " },
        { id: 2, text: null },
        { id: 3, text: " voiture" },
      ])
    ).toEqual([]);
  });
});
