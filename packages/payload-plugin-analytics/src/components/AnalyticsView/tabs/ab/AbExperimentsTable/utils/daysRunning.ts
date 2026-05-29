export function daysRunning(startedAt: string): number {
  const t = new Date(startedAt).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(1, Math.round((Date.now() - t) / 86_400_000));
}
