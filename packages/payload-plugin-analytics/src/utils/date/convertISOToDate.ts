export function convertISOToDate(iso: string) {
  const parts = iso.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  return new Date(Date.UTC(y, m - 1, d));
}
