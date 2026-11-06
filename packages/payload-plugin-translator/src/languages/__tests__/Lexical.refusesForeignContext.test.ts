import { describe, expect, it } from "vitest";

import { CannotEnterLanguageError } from "../../core/traversal/index.js";
import { LEXICAL_ID } from "../Lexical.language.js";
import { claimsNothing, paragraph, text, tree, walkTree } from "./fixtures/lexical.js";

const refusalFrom = (run: () => unknown): CannotEnterLanguageError => {
  try {
    run();
  } catch (error) {
    if (error instanceof CannotEnterLanguageError) return error;
    throw error;
  }
  throw new Error("nothing was refused");
};

describe("the lexical language and the context it is handed", () => {
  it("walks a context carrying a lexical tree and a resolver", () => {
    const targets = walkTree({ tree: tree(paragraph(text("Hello"))), embed: claimsNothing });

    expect(targets.map((target) => target.text)).toEqual(["Hello"]);
  });

  it("takes an empty tree as its own: nothing to walk is not a refusal", () => {
    expect(walkTree({ tree: tree(), embed: claimsNothing })).toEqual([]);
  });

  it.each([
    ["no context at all", null],
    ["no tree", { embed: claimsNothing }],
    ["a tree that is a string", { tree: "<p>Hello</p>", embed: claimsNothing }],
    [
      "a tree that is a lexical node rather than a root",
      { tree: { type: "root", version: 1, children: [] }, embed: claimsNothing },
    ],
    ["the field language's own context", { fields: [], data: {}, source: {} }],
    ["a lexical root but no resolver", { tree: tree(paragraph(text("Hello"))) }],
  ])("refuses a context with %s", (_label, context) => {
    expect(refusalFrom(() => walkTree(context)).languageId).toBe(LEXICAL_ID);
  });
});
