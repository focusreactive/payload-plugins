export function convertMetricToNumber(s: string | null | undefined) {
  if (s === null || s === undefined || s === "") return 0;

  const n = Number(s);

  return Number.isFinite(n) ? n : 0;
}
