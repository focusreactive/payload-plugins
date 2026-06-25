import { afterEach, describe, expect, it, vi } from "vitest";
import { createResolveDocs } from "../../../src/content/resolve/resolve-docs";

afterEach(() => vi.restoreAllMocks());

function mockFetch(handler: (url: string) => { ok?: boolean; body?: unknown }) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      const r = handler(url);
      return { ok: r.ok ?? true, json: async () => r.body ?? {} };
    })
  );
  return calls;
}

describe("createResolveDocs", () => {
  it("issues one request per query, in parallel, keyed by collection:id", async () => {
    const calls = mockFetch((url) =>
      url.includes("/page")
        ? { body: { docs: [{ id: 1, slug: "home" }] } }
        : { body: { docs: [{ id: 7, url: "/a.jpg" }] } }
    );
    const resolveDocs = createResolveDocs("/api", "en");
    const store = await resolveDocs([
      { collection: "page", ids: [1], select: ["slug"], depth: 1 },
      { collection: "media", ids: [7], select: ["url"] },
    ]);
    expect(calls).toHaveLength(2);
    expect(store.get("page", 1)).toEqual({ id: 1, slug: "home" });
    expect(store.get("media", 7)).toEqual({ id: 7, url: "/a.jpg" });
  });

  it("builds depth, locale, and select query params", async () => {
    const calls = mockFetch(() => ({ body: { docs: [] } }));
    const resolveDocs = createResolveDocs("/api", "es");
    await resolveDocs([
      { collection: "page", ids: [1], select: ["slug", "breadcrumbs"], depth: 2 },
    ]);
    const url = calls[0];
    expect(url).toContain("/api/page?");
    expect(url).toContain("depth=2");
    expect(url).toContain("locale=es");
    expect(url).toContain("select%5Bslug%5D=true");
    expect(url).toContain("select%5Bbreadcrumbs%5D=true");
  });

  it("defaults depth to 0, dedupes ids, and skips empty-id queries", async () => {
    const calls = mockFetch(() => ({ body: { docs: [{ id: 1 }] } }));
    const resolveDocs = createResolveDocs("/api", undefined);
    await resolveDocs([
      { collection: "page", ids: [1, 1, "1"] },
      { collection: "media", ids: [] },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("depth=0");
    expect(calls[0]).toContain("where%5Bid%5D%5Bin%5D%5B0%5D=1");
    expect(calls[0]).not.toContain("where%5Bid%5D%5Bin%5D%5B1%5D");
  });

  it("isolates a failed query without sinking the others", async () => {
    mockFetch((url) =>
      url.includes("/page") ? { ok: false } : { body: { docs: [{ id: 7, url: "/a.jpg" }] } }
    );
    const resolveDocs = createResolveDocs("/api", undefined);
    const store = await resolveDocs([
      { collection: "page", ids: [1] },
      { collection: "media", ids: [7] },
    ]);
    expect(store.get("page", 1)).toBeUndefined();
    expect(store.get("media", 7)).toEqual({ id: 7, url: "/a.jpg" });
  });

  it("isolates a thrown fetch (network error) without sinking other queries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/page")) throw new Error("network down");
        return { ok: true, json: async () => ({ docs: [{ id: 7, url: "/a.jpg" }] }) };
      })
    );
    const resolveDocs = createResolveDocs("/api", undefined);
    const store = await resolveDocs([
      { collection: "page", ids: [1] },
      { collection: "media", ids: [7] },
    ]);
    expect(store.get("page", 1)).toBeUndefined();
    expect(store.get("media", 7)).toEqual({ id: 7, url: "/a.jpg" });
  });

  it("returns an empty store when no apiRoute is configured", async () => {
    const calls = mockFetch(() => ({ body: { docs: [] } }));
    const resolveDocs = createResolveDocs(undefined, "en");
    const store = await resolveDocs([{ collection: "page", ids: [1] }]);
    expect(calls).toHaveLength(0);
    expect(store.get("page", 1)).toBeUndefined();
  });
});
