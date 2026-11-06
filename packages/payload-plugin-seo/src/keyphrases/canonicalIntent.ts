import { foldedWords } from "./text";

export function canonicalIntent(phrase: string): string {
  return foldedWords(phrase).sort().join(" ");
}
