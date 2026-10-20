import { describe, expect, it } from "vitest";
import { bodyDocument, bodySchema } from "./fixtures/documents.js";
import {
  CROSSINGS_PER_LEVEL,
  LEVELS,
  collect,
  richTextNestedThroughEmbeds,
} from "./fixtures/harness.js";

describe("a self-describing language reached across a boundary", () => {
  it("collects the prose and the text inside an embedded component", () => {
    const targets = collect({
      fields: bodySchema(),
      source: bodyDocument(),
      target: bodyDocument(),
    });

    expect(targets.map((target) => target.text)).toEqual(["Lead in", "Click me", "Please"]);
  });

  it("addresses a leaf inside the embed, through the rich text", () => {
    const targets = collect({
      fields: bodySchema(),
      source: bodyDocument(),
      target: bodyDocument(),
    });

    expect(targets.map((target) => target.idPath)).toEqual([
      ["body", 0, 0],
      ["body", 1, "cta-1", "heading"],
      ["body", 1, "cta-1", "description"],
    ]);
  });

  it("walks nesting five levels deep", () => {
    const { fields, document } = richTextNestedThroughEmbeds(LEVELS);
    const targets = collect({
      fields,
      source: document,
      target: document,
      maxCrossings: CROSSINGS_PER_LEVEL * LEVELS,
    });

    expect(targets.map((target) => target.text)).toEqual([
      "level 1",
      "level 2",
      "level 3",
      "level 4",
      "level 5",
    ]);
  });
});
