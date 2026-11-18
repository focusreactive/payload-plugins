import { describe, expect, it } from "vitest";
import { TooManyCrossingsError } from "../errors/index.js";
import {
  CROSSINGS_PER_LEVEL,
  LEVELS,
  collect,
  richTextNestedThroughEmbeds,
} from "./fixtures/harness.js";

describe("the crossing cap", () => {
  it("allows exactly the crossings it was given, and no more", () => {
    const { fields, document } = richTextNestedThroughEmbeds(1);

    // One rich-text level is two crossings: into the rich text, and back out into the embed.
    expect(() =>
      collect({ fields, source: document, target: document, maxCrossings: CROSSINGS_PER_LEVEL })
    ).not.toThrow();
    expect(() =>
      collect({ fields, source: document, target: document, maxCrossings: CROSSINGS_PER_LEVEL - 1 })
    ).toThrow(TooManyCrossingsError);
  });

  it("names where it stopped", () => {
    const { fields, document } = richTextNestedThroughEmbeds(LEVELS);

    let thrown: unknown;
    try {
      collect({ fields, source: document, target: document, maxCrossings: 2 });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(TooManyCrossingsError);
    expect((thrown as TooManyCrossingsError).idPath.length).toBeGreaterThan(0);
  });
});
