import { describe, expect, it } from "vitest";

import { applyTranslations } from "../collect.js";
import { collect, paragraph } from "./fixtures/harness.js";
import { PROSEMIRROR_ID } from "./fixtures/prosemirror.js";
import type { FieldLike } from "./fixtures/payloadFields.js";

const schema: FieldLike[] = [
  { type: "richText", name: "body", localized: true, richTextLanguage: PROSEMIRROR_ID },
];

const targetWithItsOwnText = () => ({
  body: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Ich kaufte ein rotes Auto" }] },
      { type: "paragraph", content: [{ type: "text", text: "Nur hier" }] },
    ],
  },
});

const shout = (text: string) => text.toUpperCase();

describe("a second run into a target that already holds its own rich text", () => {
  it("sends the source's text, never the target's", () => {
    const source = paragraph();

    const { targets } = collect({ fields: schema, source, target: targetWithItsOwnText() });

    const sent = targets.map((target) => (target.kind === "text" ? target.text : "")).join("|");
    expect(sent).toContain("red");
    expect(sent).not.toContain("Nur hier");
  });

  it("leaves nothing of the target behind: the source replaces it in full", () => {
    const source = paragraph();
    const target = targetWithItsOwnText();

    const collected = collect({ fields: schema, source, target });
    applyTranslations(
      collected,
      collected.targets.map((item) => (item.kind === "text" ? shout(item.text) : undefined))
    );

    expect(JSON.stringify(target)).not.toContain("Nur hier");
    expect(JSON.stringify(target)).toContain("RED");
  });

  it("does not touch the source it read from", () => {
    const source = paragraph();
    const before = structuredClone(source);

    const collected = collect({ fields: schema, source, target: targetWithItsOwnText() });
    applyTranslations(
      collected,
      collected.targets.map((item) => (item.kind === "text" ? shout(item.text) : undefined))
    );

    expect(source).toEqual(before);
  });
});
