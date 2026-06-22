import type { ReactNode } from "react";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightKeyphrase(text: string, keyphrase: string): ReactNode[] {
  if (!keyphrase.trim()) return [text];

  const segments = text.split(new RegExp(`(${escapeRegex(keyphrase)})`, "gi"));

  return segments.map((segment, index) =>
    index % 2 === 1 ? <strong key={index}>{segment}</strong> : segment
  );
}
