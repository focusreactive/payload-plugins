import { describe, expect, it } from "vitest";

import { claimsNothing, element, paragraph, text, tree } from "../../__tests__/fixtures/lexical.js";
import type { Node, Tree } from "../../__tests__/fixtures/lexical.js";
import type { LexicalCursor } from "../PayloadLexical.language.js";
import { payloadLexicalLanguage } from "../PayloadLexical.language.js";

const cursor: LexicalCursor = { embed: claimsNothing, position: () => 0 };

const bolded = (value: string) => ({ ...text(value), format: 1 });

/** What the language offers for the first container of a tree. */
const unitsFor = (built: Tree) => {
  const language = payloadLexicalLanguage();
  const entered = language.enter({ context: { tree: built, embed: claimsNothing } });
  if (entered === null) throw new Error("the language refused the tree");

  const root = entered.nodes[0];
  if (root === undefined) throw new Error("the tree yielded no node");
  const opened = language.step(root, cursor);
  if (opened.kind !== "children") throw new Error("expected the root to open onto its children");

  const container = opened.items[0]?.nodes[0];
  if (container === undefined) throw new Error("the root yielded no child");
  const step = language.step(container, cursor);
  if (step.kind !== "value") throw new Error("expected the container to be a value position");

  return language.textUnits({ value: step.value, slot: step.slot });
};

describe("a container with something to reorder", () => {
  it("is one unit carrying its runs in source order", () => {
    const units = unitsFor(tree(paragraph(text("a "), bolded("red"), text(" car"))));

    expect(units).toHaveLength(1);
    expect(units[0]?.kind).toBe("pieces");
    expect(units[0]?.kind === "pieces" ? units[0].pieces : []).toEqual([
      { id: 1, text: "a " },
      { id: 2, text: "red" },
      { id: 3, text: " car" },
    ]);
  });
});

describe("a container with nothing to reorder", () => {
  it("keeps the per-text-node cut, so one word travels as one plain string", () => {
    const units = unitsFor(tree(paragraph(text("Solo"))));

    expect(units).toEqual([expect.objectContaining({ kind: "text", text: "Solo" })]);
  });

  it("keeps it for a wrapper the fragment collector refuses, which has no fragments at all", () => {
    // A link holding two runs and a line break: the collector cannot make per-leaf copies of it,
    // so it reports no fragments — and the text inside must still be translated.
    const refused = element(
      "link",
      text("one"),
      { type: "linebreak", version: 1 } as unknown as Node,
      text("two")
    );
    const units = unitsFor(tree(paragraph(text(" "), refused)));

    expect(units.map((unit) => (unit.kind === "text" ? unit.text : "<pieces>"))).toEqual([
      "one",
      "two",
    ]);
  });
});
