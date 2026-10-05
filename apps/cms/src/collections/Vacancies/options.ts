export const WORKPLACE_OPTIONS = [
  { label: "On-site", value: "onSite" },
  { label: "Hybrid", value: "hybrid" },
  { label: "Remote", value: "remote" },
] as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  { label: "Full-time", value: "fullTime" },
  { label: "Part-time", value: "partTime" },
  { label: "Contract", value: "contract" },
  { label: "Internship", value: "internship" },
] as const;

export function optionLabel(
  options: readonly { label: string; value: string }[],
  value: string | null | undefined
): string | null {
  return options.find((option) => option.value === value)?.label ?? null;
}
