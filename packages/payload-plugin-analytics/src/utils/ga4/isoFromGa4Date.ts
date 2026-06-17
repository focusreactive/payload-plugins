export function isoFromGa4Date(date: string | null | undefined): string {
  if (!date || date.length !== 8) return "";

  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}
