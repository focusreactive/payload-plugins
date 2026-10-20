import { describe, expect, it } from "vitest";

import { collectTranslationTargets } from "../collect.js";
import type { Language } from "../contract.js";
import { CannotEnterLanguageError } from "../errors/index.js";

const outer = (context: unknown): Language<string, null> => ({
  id: "outer",
  enter: () => ({ nodes: ["leaf"], cursor: null }),
  step: () => ({ kind: "value", value: "text", segments: ["here"] }),
  selects: () => true,
  isEmpty: () => false,
  textUnits: () => [],
  boundary: () => ({ languageId: "inner", context }),
});

const inner: Language<string, null> = {
  id: "inner",
  enter: ({ context }) => {
    const carried = context as { mine?: boolean };
    return carried.mine === true ? { nodes: ["leaf"], cursor: null } : null;
  },
  step: () => ({ kind: "value", value: "inner text", segments: [] }),
  selects: () => true,
  isEmpty: () => false,
  textUnits: ({ value }) => [{ text: value as string, write: () => undefined }],
  boundary: () => null,
};

const walk = (context: unknown) =>
  collectTranslationTargets({
    languages: [outer(context), inner],
    entry: { languageId: "outer", context: {} },
  });

describe("a crossing that hands over the wrong context", () => {
  it("is reported against the language that refused it, not the one that built it", () => {
    let thrown: unknown;
    try {
      walk({ notMine: true });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CannotEnterLanguageError);
    expect((thrown as CannotEnterLanguageError).languageId).toBe("inner");
  });

  it("carries the address the crossing was made at", () => {
    let thrown: unknown;
    try {
      walk({ notMine: true });
    } catch (error) {
      thrown = error;
    }

    expect((thrown as CannotEnterLanguageError).idPath).toEqual(["here"]);
  });

  it("lets the same crossing through when the context is right", () => {
    expect(walk({ mine: true }).map((target) => target.text)).toEqual(["inner text"]);
  });
});
