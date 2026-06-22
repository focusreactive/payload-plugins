// tests/services/pageFilter/existingRefsCache.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getCachedExistingRefs,
  __clearExistingRefsCache,
  __setNowForTests,
} from "../../../src/services/pageFilter/existingRefsCache";

describe("existingRefsCache", () => {
  beforeEach(() => {
    __clearExistingRefsCache();
    __setNowForTests(1_000_000);
  });

  it("calls the loader on first access and caches within TTL", async () => {
    const loader = vi.fn().mockResolvedValue(new Set(["page:1"]));
    const a = await getCachedExistingRefs("key", loader);
    __setNowForTests(1_000_000 + 30_000); // +30s, within 60s TTL
    const b = await getCachedExistingRefs("key", loader);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("reloads after the TTL expires", async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce(new Set(["page:1"]))
      .mockResolvedValueOnce(new Set(["page:2"]));
    await getCachedExistingRefs("key", loader);
    __setNowForTests(1_000_000 + 61_000); // past 60s TTL
    const b = await getCachedExistingRefs("key", loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect([...b]).toEqual(["page:2"]);
  });

  it("isolates entries by cache key", async () => {
    const l1 = vi.fn().mockResolvedValue(new Set(["page:1"]));
    const l2 = vi.fn().mockResolvedValue(new Set(["posts:9"]));
    await getCachedExistingRefs("k1", l1);
    await getCachedExistingRefs("k2", l2);
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
  });
});
