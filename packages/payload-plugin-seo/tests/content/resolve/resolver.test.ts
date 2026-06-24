import { afterEach, describe, expect, it, vi } from "vitest";
import { createDocResolver } from "../../../src/content/resolve/resolver";
import type { DocRef } from "../../../src/content/resolve/types";

const ref = (collection: string, id: number): DocRef => ({ collection, id, kind: "relationship" });

afterEach(() => vi.restoreAllMocks());

function mockFetch(byUrl: (url: string) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({ ok: true, json: async () => byUrl(url) }))
  );
}

describe("createDocResolver", () => {
  it("batches one request per collection and keys results by refKey", async () => {
    const calls: string[] = [];
    mockFetch((url) => {
      calls.push(url);
      return {
        docs: [
          { id: 1, title: "A" },
          { id: 2, title: "B" },
        ],
      };
    });
    const r = createDocResolver("/api");
    const out = await r.resolve([ref("posts", 1), ref("posts", 2)], undefined, 1);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/api/posts?");
    expect(calls[0]).toContain("depth=1");
    expect(out.get("posts:1")).toEqual({ id: 1, title: "A" });
    expect(out.get("posts:2")).toEqual({ id: 2, title: "B" });
  });

  it("includes depth and locale in the cache key (refetches on depth change)", async () => {
    let n = 0;
    mockFetch(() => {
      n += 1;
      return { docs: [{ id: 1, title: `v${n}` }] };
    });
    const r = createDocResolver("/api");
    await r.resolve([ref("posts", 1)], "en", 0);
    await r.resolve([ref("posts", 1)], "en", 0); // cached → no new fetch
    expect(n).toBe(1);
    await r.resolve([ref("posts", 1)], "en", 2); // different depth → refetch
    expect(n).toBe(2);
  });

  it("caches misses as absent and survives fetch errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    );
    const r = createDocResolver("/api");
    const out = await r.resolve([ref("posts", 9)], undefined, 1);
    expect(out.has("posts:9")).toBe(false);
  });
});
