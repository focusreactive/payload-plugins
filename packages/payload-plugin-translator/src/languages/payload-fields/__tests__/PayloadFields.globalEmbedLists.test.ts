import { describe, expect, it } from "vitest";

import type { BlockLike, FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { projectFieldsToFieldLike } from "../../../core/kernel/field-traversal/index.js";
import { block, paragraph, text, tree, walkDocument } from "../../__tests__/fixtures/lexical.js";
import { sentTextsOf } from "../../../core/traversal/__tests__/fixtures/sentText.js";

const cta: BlockLike = {
  slug: "cta",
  fields: [{ type: "text", name: "heading", localized: true }],
};

const bodyTree = () => tree(paragraph(text("Intro")), block({ blockType: "cta", heading: "Buy" }));

const schema = (custom?: Record<string, unknown>): FieldLike[] =>
  projectFieldsToFieldLike([
    { type: "richText", name: "body", localized: true, ...(custom ? { custom } : {}) },
  ]);

const textsFound = (fields: FieldLike[]): string[] =>
  sentTextsOf(
    walkDocument({
      schema: fields,
      source: { body: bodyTree() },
      blocks: [cta],
    }).collected.targets
  );

describe("the blocks a host may enter", () => {
  it("come from the plugin's own list for a field that declares nothing", () => {
    expect(textsFound(schema())).toEqual(["Intro", "Buy"]);
  });

  it("come from that same list where a field carries a leftover declaration", () => {
    // `custom.translateKit.crossing` is no longer a channel. A field still carrying one, written
    // against an earlier build, must narrow nothing — least of all down to no embeds at all.
    expect(textsFound(schema({ translateKit: { crossing: { embeds: "none" } } }))).toEqual([
      "Intro",
      "Buy",
    ]);
  });
});
