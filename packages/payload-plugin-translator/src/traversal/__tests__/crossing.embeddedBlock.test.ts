import { describe, expect, it } from "vitest";
import { LEXICAL_ID, lexicalLanguage } from "./fixtures/lexical.js";
import { fromPayload, lexicalPost, postsSchema } from "./fixtures/harness.js";
import { sentTextsOf } from "./fixtures/sentText.js";

const postWithNamelessEmbed = () => ({
  content: {
    root: {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", text: "Intro" }] },
        { type: "inlineBlock", fields: { heading: "Orphan" } },
      ],
    },
  },
});

describe("Payload fields → Lexical → Payload fields", () => {
  it("collects the text inside a block embedded in a rich-text field", () => {
    const document = lexicalPost();
    const { targets } = fromPayload(postsSchema(LEXICAL_ID), document, lexicalLanguage());

    expect(sentTextsOf(targets)).toEqual([
      "Intro",
      "Click me",
      "Please",
      "Get started",
      "Read the docs",
    ]);
  });

  it("addresses the embedded leaves inside the rich-text field", () => {
    const document = lexicalPost();
    const { targets } = fromPayload(postsSchema(LEXICAL_ID), document, lexicalLanguage());

    expect(targets.map((target) => target.idPath)).toEqual([
      ["content", 0, 0],
      ["content", 1, "heading"],
      ["content", 1, "description"],
      ["content", 1, "actions", "a1", "label"],
      ["content", 1, "actions", "a2", "label"],
    ]);
  });

  it("applies the host's own selection rule inside the embed", () => {
    const document = lexicalPost();
    const { targets } = fromPayload(postsSchema(LEXICAL_ID), document, lexicalLanguage());

    const texts = sentTextsOf(targets);

    expect(texts).toContain("Click me");
    expect(texts).not.toContain("/buy");
  });

  it("asks nothing for an embed its node cannot name, and keeps walking its siblings", () => {
    const { targets } = fromPayload(
      postsSchema(LEXICAL_ID),
      postWithNamelessEmbed(),
      lexicalLanguage()
    );

    expect(sentTextsOf(targets)).toEqual(["Intro"]);
  });
});
