import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaResolver } from "../../../src/content/uploads/media-resolver";

const okResponse = (docs: unknown[]) => ({ ok: true, json: async () => ({ docs }) });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createMediaResolver", () => {
  it("fetches per collection with depth 0, locale, and id filters; returns docs keyed collection:id", async () => {
    const fetchMock = vi.fn(async () => okResponse([{ id: 1, url: "/m/a.jpg", mimeType: "image/jpeg", alt: "A" }]));
    vi.stubGlobal("fetch", fetchMock);

    const resolver = createMediaResolver("/api");
    const out = await resolver.resolve([{ collection: "media", id: 1 }], "en");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/media?");
    expect(url).toContain("depth=0");
    expect(url).toContain("locale=en");
    expect(decodeURIComponent(url)).toContain("where[id][in][0]=1");
    expect(init.credentials).toBe("include");
    expect(out.get("media:1")).toMatchObject({ url: "/m/a.jpg" });
  });

  it("caches resolved docs per locale and refetches only missing refs", async () => {
    const fetchMock = vi.fn(async () => okResponse([{ id: 1, url: "/m/a.jpg", mimeType: "image/jpeg" }]));
    vi.stubGlobal("fetch", fetchMock);
    const resolver = createMediaResolver("/api");

    await resolver.resolve([{ collection: "media", id: 1 }], "en");
    await resolver.resolve([{ collection: "media", id: 1 }], "en");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await resolver.resolve([{ collection: "media", id: 1 }], "de");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caches not-found/failed lookups as misses until invalidate()", async () => {
    const fetchMock = vi.fn(async () => okResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const resolver = createMediaResolver("/api");

    const first = await resolver.resolve([{ collection: "media", id: 2 }], "en");
    expect(first.size).toBe(0);
    await resolver.resolve([{ collection: "media", id: 2 }], "en");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolver.invalidate();
    await resolver.resolve([{ collection: "media", id: 2 }], "en");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("swallows network errors and non-OK responses", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("boom");
    });
    vi.stubGlobal("fetch", fetchMock);
    const resolver = createMediaResolver("/api");

    await expect(resolver.resolve([{ collection: "media", id: 3 }], "en")).resolves.toEqual(new Map());
  });

  it("groups refs into one request per collection", async () => {
    const fetchMock = vi.fn(async (url: string) => okResponse(url.includes("/media?") ? [{ id: 1, url: "/a.jpg", mimeType: "image/png" }] : [{ id: 2, url: "/b.pdf", mimeType: "application/pdf" }]));
    vi.stubGlobal("fetch", fetchMock);
    const resolver = createMediaResolver("/api");

    const out = await resolver.resolve(
      [
        { collection: "media", id: 1 },
        { collection: "docs", id: 2 },
      ],
      undefined
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.size).toBe(2);
  });
});
