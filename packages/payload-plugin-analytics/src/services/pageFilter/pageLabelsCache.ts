import type { PageLabel } from "./resolvePageLabels";

const TTL_MS = 60_000;

interface Entry {
  value: Map<string, PageLabel>;
  expiresAt: number;
}

const cache = new Map<string, Entry>();
let nowFn: () => number = () => Date.now();

export function __setNowForTests(ms: number): void {
  nowFn = () => ms;
}

export function __clearPageLabelsCache(): void {
  cache.clear();
}

export async function getCachedPageLabels(
  key: string,
  loader: () => Promise<Map<string, PageLabel>>
): Promise<Map<string, PageLabel>> {
  const now = nowFn();
  const hit = cache.get(key);

  if (hit && hit.expiresAt > now) return hit.value;

  const value = await loader();

  cache.set(key, { value, expiresAt: now + TTL_MS });

  return value;
}
