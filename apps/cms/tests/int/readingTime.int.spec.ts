import { describe, expect, it } from "vitest";

import { readingTimeMinutes } from "@/lib/utils/readingTime";
import { extractLexicalText } from "@/lib/utils/text";

import { markedNode, paragraphsOf } from "../support/markers";

const WORDS_PER_SENTENCE = 10;
const SENTENCES = 160;
const SENTENCE = Array.from({ length: WORDS_PER_SENTENCE }, () => "word").join(" ");

const content = (textOf: (sentence: string, index: number) => string) =>
  paragraphsOf(Array.from({ length: SENTENCES }, (_, index) => textOf(SENTENCE, index)));

const STORED_CONTENT = content((sentence) => sentence);
const DRAFT_READ_CONTENT = content((sentence, index) => markedNode(sentence, `${index}.0`));

describe("the reading time of a post", () => {
  it("is the same for a draft read with markers as for the stored content", () => {
    expect(readingTimeMinutes(STORED_CONTENT)).toBe(8);
    expect(readingTimeMinutes(DRAFT_READ_CONTENT)).toBe(8);
  });
});

describe("the plain text of rich text", () => {
  it("carries no marker of a draft read", () => {
    expect(extractLexicalText(DRAFT_READ_CONTENT)).toBe(extractLexicalText(STORED_CONTENT));
  });
});
