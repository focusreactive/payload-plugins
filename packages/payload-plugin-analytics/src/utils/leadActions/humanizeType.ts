export function humanizeType(value: string) {
  if (!value) return "";

  const lower = value.replace(/_+/gu, " ").trim().toLowerCase();

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
