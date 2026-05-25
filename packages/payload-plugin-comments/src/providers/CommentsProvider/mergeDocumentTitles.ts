import type { DocumentTitles } from "../../types";

export function mergeDocumentTitles(
  prev: DocumentTitles,
  incoming: DocumentTitles
): DocumentTitles {
  return {
    ...prev,
    ...Object.fromEntries(
      Object.entries(incoming).map(([slug, ids]) => [
        slug,
        { ...prev[slug], ...ids },
      ])
    ),
  };
}
