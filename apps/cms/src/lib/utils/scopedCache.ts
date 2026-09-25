import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Vercel's data cache is shared by every preview deployment of a project and outlives each
 * deployment, while `unstable_cache` builds its key from the callback's source and the key parts
 * only. Two branches running the same code therefore read and write the same entries, and one
 * branch's preview served another branch's site settings (2026-09-23). The branch URL is unique
 * per project and branch; the deployment URL covers a CLI deployment that has no branch.
 */
const CACHE_SCOPE = process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL ?? "local";

type CacheOptions = NonNullable<Parameters<typeof unstable_cache>[2]>;
type RevalidateProfile = Parameters<typeof revalidateTag>[1];

export function scopeCacheTag(tag: string): string {
  return `${CACHE_SCOPE}:${tag}`;
}

export function scopedCache<Arguments extends unknown[], Result>(
  callback: (...callbackArguments: Arguments) => Promise<Result>,
  keyParts: string[],
  options: CacheOptions = {}
): (...callbackArguments: Arguments) => Promise<Result> {
  return unstable_cache(callback, [CACHE_SCOPE, ...keyParts], {
    ...options,
    tags: options.tags?.map(scopeCacheTag),
  });
}

export function revalidateScopedTag(tag: string, profile: RevalidateProfile): void {
  revalidateTag(scopeCacheTag(tag), profile);
}
