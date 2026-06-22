const DEFAULT_ROW_LIMIT = 10;
const GA4_MAX_ROW_LIMIT = 250_000;

export function withRowLimit<R extends object>(
  req: R,
  limit: number | undefined
): R & { limit: number } {
  const n = limit ?? DEFAULT_ROW_LIMIT;
  const clamped = Math.max(1, Math.min(GA4_MAX_ROW_LIMIT, Math.trunc(n)));

  return { ...req, limit: clamped };
}
