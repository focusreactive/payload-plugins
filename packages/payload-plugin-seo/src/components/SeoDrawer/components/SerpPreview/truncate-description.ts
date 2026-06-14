export const SERP_DESCRIPTION_MAX = 156;

const OMISSION = " …";

export function truncateDescription(text: string, max = SERP_DESCRIPTION_MAX): string {
  if (text.length <= max) return text;

  const budget = max - OMISSION.length;
  const candidate = text.slice(0, budget);

  const lastSpace = candidate.search(/\s+(?=\S*$)/);
  const cut = lastSpace > 0 ? candidate.slice(0, lastSpace) : candidate;

  return cut.trimEnd() + OMISSION;
}
