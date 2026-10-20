import { describe, expect, it } from "vitest";
import type { FieldLike } from "./fixtures/payloadFields.js";
import { LEXICAL_ID, lexicalLanguage } from "./fixtures/lexical.js";
import { fromPayload, lexicalPost, postsSchema } from "./fixtures/harness.js";

/** A marked sibling, so "nothing came from the rich text" cannot be met by collecting nothing. */
const withTitle = (content: FieldLike[]): FieldLike[] => [
  { type: "text", name: "title", localized: true },
  ...content,
];

const postWithTitle = () => ({ title: "Keep me", ...lexicalPost() });

describe("a rich text the host did not mark for translation", () => {
  it("is not crossed into, so none of its prose is collected", () => {
    const unmarked = postsSchema(LEXICAL_ID).map((field) => ({ ...field, localized: undefined }));

    const targets = fromPayload(withTitle(unmarked), postWithTitle(), lexicalLanguage());

    expect(targets.map((target) => target.text)).toEqual(["Keep me"]);
  });

  it("is not crossed into when it is excluded, either", () => {
    const excluded = postsSchema(LEXICAL_ID).map((field) => ({ ...field, excluded: true }));

    const targets = fromPayload(withTitle(excluded), postWithTitle(), lexicalLanguage());

    expect(targets.map((target) => target.text)).toEqual(["Keep me"]);
  });
});
