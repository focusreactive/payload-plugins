const TTL_MS = 60_000;

interface Entry {
  value: Set<string>;
  expiresAt: number;
}

const cache = new Map<string, Entry>();
let nowFn: () => number = () => Date.now();

export function __setNowForTests(ms: number): void {
  nowFn = () => ms;
}

export function __clearExistingRefsCache(): void {
  cache.clear();
}

export async function getCachedExistingRefs(
  key: string,
  loader: () => Promise<Set<string>>
): Promise<Set<string>> {
  const now = nowFn();
  const hit = cache.get(key);

  if (hit && hit.expiresAt > now) return hit.value;

  const value = await loader();

  cache.set(key, { value, expiresAt: now + TTL_MS });

  return value;
}
