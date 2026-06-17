// tests/services/pageFilter/pageLabelsCache.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCachedPageLabels, __clearPageLabelsCache, __setNowForTests } from "../../../src/services/pageFilter/pageLabelsCache";

describe("pageLabelsCache", () => {
  beforeEach(() => {
    __clearPageLabelsCache();
    __setNowForTests(1_000_000);
  });

  it("loads once and caches within TTL", async () => {
    const loader = vi.fn().mockResolvedValue(new Map([["pages:1", { path: "/a", title: "A" }]]));
    const a = await getCachedPageLabels("k", loader);
    __setNowForTests(1_030_000);
    const b = await getCachedPageLabels("k", loader);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("reloads after TTL", async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce(new Map())
      .mockResolvedValueOnce(new Map([["pages:2", { path: "/b", title: "B" }]]));
    await getCachedPageLabels("k", loader);
    __setNowForTests(1_061_000);
    const b = await getCachedPageLabels("k", loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(b.get("pages:2")).toEqual({ path: "/b", title: "B" });
  });
});
