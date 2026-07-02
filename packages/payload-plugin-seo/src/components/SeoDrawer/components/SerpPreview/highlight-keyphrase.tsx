import type { ReactNode } from "react";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHighlightPattern(keyphrase: string, synonyms: string[]): string | null {
  const terms = [keyphrase, ...synonyms]
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);

  if (terms.length === 0) return null;

  return terms.join("|");
}

export function highlightKeyphrase(
  text: string,
  keyphrase: string,
  synonyms: string[] = []
): ReactNode[] {
  const pattern = buildHighlightPattern(keyphrase, synonyms);
  if (!pattern) return [text];

  const segments = text.split(new RegExp(`(${pattern})`, "gi"));

  return segments.map((segment, index) =>
    index % 2 === 1 ? <strong key={index}>{segment}</strong> : segment
  );
}
