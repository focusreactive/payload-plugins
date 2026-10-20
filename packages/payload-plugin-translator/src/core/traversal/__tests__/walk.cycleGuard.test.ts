import { describe, expect, it } from "vitest";

import { collectTranslationTargets } from "../collect.js";
import { TraversalCycleError } from "../errors/index.js";
import type { FieldLike } from "./fixtures/payloadFields.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "./fixtures/payloadFields.js";
import type { PmNode } from "./fixtures/prosemirror.js";
import { PROSEMIRROR_ID, prosemirrorLanguage } from "./fixtures/prosemirror.js";

/** Fails with whatever else was thrown — a stack overflow included. */
const cycleErrorFrom = (run: () => unknown): TraversalCycleError => {
  try {
    run();
  } catch (error) {
    if (error instanceof TraversalCycleError) return error;
    throw error;
  }
  throw new Error("the walk finished without reporting a cycle");
};

const nested = () => ({ child: { label: "one", child: { label: "two" } } });

const twoHeroes = () => ({
  sections: [
    { id: "a", blockType: "hero", heading: "First" },
    { id: "b", blockType: "hero", heading: "Second" },
  ],
});

describe("the cycle guard", () => {
  it("stops a node that contains itself, where the crossing cap never would", () => {
    const loop: PmNode = { type: "paragraph", content: [{ type: "text", text: "Again" }] };
    loop.content?.push(loop);

    const error = cycleErrorFrom(() =>
      collectTranslationTargets({
        languages: [prosemirrorLanguage()],
        entry: {
          languageId: PROSEMIRROR_ID,
          context: { tree: { type: "doc", content: [loop] } },
        },
      })
    );

    expect(error.idPath.length).toBeGreaterThan(0);
  });

  it("walks a schema node that contains itself, as long as the data moves on", () => {
    // The pair is what makes this legal: the same field node, at a different data position,
    // every time. Compare the node alone and this reads as a cycle at the second level.
    const selfReferential: FieldLike = {
      type: "group",
      name: "child",
      fields: [{ type: "text", name: "label", localized: true }],
    };
    selfReferential.fields?.push(selfReferential);

    const targets = collectTranslationTargets({
      languages: [payloadFieldsLanguage()],
      entry: {
        languageId: PAYLOAD_FIELDS_ID,
        context: { fields: [selfReferential], source: nested(), target: nested() },
      },
    });

    expect(targets.map((target) => target.text)).toEqual(["one", "two"]);
  });

  it("does not mistake one schema node walked over many elements for a cycle", () => {
    const schema: FieldLike[] = [
      {
        type: "blocks",
        name: "sections",
        blocks: [{ slug: "hero", fields: [{ type: "text", name: "heading", localized: true }] }],
      },
    ];
    const targets = collectTranslationTargets({
      languages: [payloadFieldsLanguage()],
      entry: {
        languageId: PAYLOAD_FIELDS_ID,
        context: { fields: schema, source: twoHeroes(), target: twoHeroes() },
      },
    });

    expect(targets.map((target) => target.text)).toEqual(["First", "Second"]);
  });
});
