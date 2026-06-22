// tests/services/pageFilter/resolvePageLabels.test.ts
import { describe, expect, it, vi } from "vitest";
import { resolvePageLabels } from "../../../src/services/pageFilter/resolvePageLabels";
import type { ResolvedPagesConfig } from "../../../src/config/resolvePagesConfig";

function cfg(over: Partial<ResolvedPagesConfig> = {}): ResolvedPagesConfig {
  return {
    collections: [{ slug: "pages", publishedOnly: true, titleField: "title" }],
    syntheticRefs: ["__home"],
    dimensions: {
      pageRef: "customEvent:fr_page_ref",
      contentLocale: "customEvent:fr_content_locale",
    },
    resolvePagePath: (ref) => (ref === "__home" ? "/" : `/p/${ref.split(":")[1]}`),
    ...over,
  };
}

function fakeReq(byCollection: Record<string, Array<{ id: number; title?: string }>>) {
  return {
    payload: {
      config: { localization: { defaultLocale: "en" } },
      find: vi.fn(async ({ collection }: { collection: string }) => ({
        docs: byCollection[collection] ?? [],
      })),
    },
  };
}

describe("resolvePageLabels", () => {
  it("resolves title from the CMS doc (default locale) and path from the callback", async () => {
    const req = fakeReq({ pages: [{ id: 42, title: "Why Pick Us" }] });
    const map = await resolvePageLabels(req as never, cfg(), ["pages:42"]);
    expect(map.get("pages:42")).toEqual({ path: "/p/42", title: "Why Pick Us" });
  });

  it("queries the title field at the default locale, selecting only that field", async () => {
    const req = fakeReq({ pages: [{ id: 1, title: "A" }] });
    await resolvePageLabels(req as never, cfg(), ["pages:1"]);
    const call = req.payload.find.mock.calls[0][0];
    expect(call.collection).toBe("pages");
    expect(call.locale).toBe("en");
    expect(call.where).toEqual({ id: { in: [1] } });
    expect(call.select).toEqual({ title: true });
  });

  it("resolves synthetic refs via the callback; title falls back to the path", async () => {
    const req = fakeReq({});
    const map = await resolvePageLabels(req as never, cfg(), ["__home"]);
    expect(map.get("__home")).toEqual({ path: "/", title: "/" });
  });

  it("falls back to the raw ref for title and path when nothing resolves", async () => {
    const req = fakeReq({ pages: [] }); // doc missing
    const map = await resolvePageLabels(req as never, cfg({ resolvePagePath: undefined }), [
      "pages:99",
    ]);
    expect(map.get("pages:99")).toEqual({ path: "pages:99", title: "pages:99" });
  });

  it("honors a custom titleField", async () => {
    const req = fakeReq({ posts: [{ id: 7, title: undefined }] });
    (req.payload.find as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      docs: [{ id: 7, name: "Headless CMS" }],
    });
    const map = await resolvePageLabels(
      req as never,
      cfg({ collections: [{ slug: "posts", publishedOnly: true, titleField: "name" }] }),
      ["posts:7"]
    );
    expect(map.get("posts:7")?.title).toBe("Headless CMS");
  });

  it("degrades gracefully when one collection's find throws, without poisoning others", async () => {
    const req = fakeReq({ pages: [{ id: 5, title: "Healthy Page" }] });
    // First find() call rejects (the throwing collection), second resolves (healthy).
    (req.payload.find as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("DB down"))
      .mockResolvedValueOnce({ docs: [{ id: 5, title: "Healthy Page" }] });
    const config = cfg({
      collections: [
        { slug: "broken", publishedOnly: true, titleField: "title" },
        { slug: "pages", publishedOnly: true, titleField: "title" },
      ],
    });
    const map = await resolvePageLabels(req as never, config, ["broken:1", "pages:5"]);
    // Throwing collection's ref falls through to path/ref fallback (path from callback).
    expect(map.get("broken:1")).toEqual({ path: "/p/1", title: "/p/1" });
    // Healthy collection still gets its real CMS title.
    expect(map.get("pages:5")).toEqual({ path: "/p/5", title: "Healthy Page" });
  });
});
