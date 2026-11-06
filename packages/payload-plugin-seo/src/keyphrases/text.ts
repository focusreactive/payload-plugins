export interface WordToken {
  word: string;
  start: number;
  end: number;
}

const WORD_PATTERN = /[\p{L}\p{N}\p{M}]+/gu;

export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .toLowerCase()
    .replace(/\p{Diacritic}/gu, "")
    .normalize("NFC");
}

export function tokenizeWords(text: string): WordToken[] {
  return [...text.matchAll(WORD_PATTERN)].map((match) => ({
    word: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

export function foldedWords(text: string): string[] {
  return tokenizeWords(text)
    .map((token) => foldText(token.word))
    .filter(Boolean);
}
