export interface WordToken {
  word: string;
  start: number;
  end: number;
}

const WORD_PATTERN = /[\p{L}\p{N}\p{M}]+/gu;
const ACCENTED_LATIN_LETTER = /(\p{Script=Latin})\p{M}+/gu;
const DISTINCT_LATIN_LETTERS = new Set(["ñ"]);

function stripLatinAccents(letter: string, base: string): string {
  return DISTINCT_LATIN_LETTERS.has(letter.normalize("NFC")) ? letter : base;
}

export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .toLowerCase()
    .replace(ACCENTED_LATIN_LETTER, stripLatinAccents)
    .normalize("NFC");
}

const wordSegmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : null;

function matchWords(text: string, offset = 0): WordToken[] {
  return [...text.matchAll(WORD_PATTERN)].map((match) => ({
    word: match[0],
    start: offset + match.index,
    end: offset + match.index + match[0].length,
  }));
}

function segmentWords(text: string, segmenter: Intl.Segmenter): WordToken[] {
  return [...segmenter.segment(text)].flatMap((segment) =>
    segment.isWordLike ? matchWords(segment.segment, segment.index) : []
  );
}

export function tokenizeWords(text: string): WordToken[] {
  return wordSegmenter ? segmentWords(text, wordSegmenter) : matchWords(text);
}

export function foldedWords(text: string): string[] {
  return tokenizeWords(text)
    .map((token) => foldText(token.word))
    .filter(Boolean);
}

export function canonicalIntent(phrase: string): string {
  return foldedWords(phrase).sort().join(" ");
}
