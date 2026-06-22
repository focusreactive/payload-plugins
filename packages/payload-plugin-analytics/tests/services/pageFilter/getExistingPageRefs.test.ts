// tests/services/pageFilter/getExistingPageRefs.test.ts
import { describe, expect, it, vi } from "vitest";
import { getExistingPageRefs } from "../../../src/services/pageFilter/getExistingPageRefs";
import type { ResolvedPagesConfig } from "../../../src/config/resolvePagesConfig";

const cfg: ResolvedPagesConfig = {
  collections: [
    { slug: "page", publishedOnly: true },
    { slug: "posts", publishedOnly: true },
  ],
  syntheticRefs: ["__home"],
  dimensions: {
    pageRef: "customEvent:fr_page_ref",
    contentLocale: "customEvent:fr_content_locale",
  },
};

function fakePayload(byCollection: Record<string, { id: string | number }[]>) {
  return {
    find: vi.fn(async ({ collection }: { collection: string }) => ({
      docs: byCollection[collection] ?? [],
    })),
  };
}

describe("getExistingPageRefs", () => {
  it("builds collection:id refs across collections + appends synthetic refs", async () => {
    const payload = fakePayload({ page: [{ id: 42 }, { id: 7 }], posts: [{ id: 7 }] });
    const refs = await getExistingPageRefs(payload as never, cfg);
    expect([...refs].sort()).toEqual(["__home", "page:42", "page:7", "posts:7"].sort());
  });

  it("queries published-only with _status filter and select id", async () => {
    const payload = fakePayload({ page: [{ id: 1 }], posts: [] });
    await getExistingPageRefs(payload as never, cfg);
    const firstCall = payload.find.mock.calls[0][0];
    expect(firstCall.collection).toBe("page");
    expect(firstCall.where).toEqual({ _status: { equals: "published" } });
    expect(firstCall.select).toEqual({ id: true });
    expect(firstCall.pagination).toBe(false);
    expect(firstCall.depth).toBe(0);
  });

  it("retries without _status when the collection has no drafts", async () => {
    const payload = {
      find: vi
        .fn()
        .mockRejectedValueOnce(new Error("The field '_status' is not valid."))
        .mockResolvedValueOnce({ docs: [{ id: 9 }] }),
    };
    const single: ResolvedPagesConfig = {
      ...cfg,
      collections: [{ slug: "events", publishedOnly: true }],
      syntheticRefs: [],
    };
    const refs = await getExistingPageRefs(payload as never, single);
    expect([...refs]).toEqual(["events:9"]);
    expect(payload.find).toHaveBeenCalledTimes(2);
    expect(payload.find.mock.calls[1][0].where).toBeUndefined();
  });

  it("re-throws non-_status errors instead of swallowing them", async () => {
    const payload = { find: vi.fn().mockRejectedValueOnce(new Error("Connection refused")) };
    const single: ResolvedPagesConfig = {
      ...cfg,
      collections: [{ slug: "events", publishedOnly: true }],
      syntheticRefs: [],
    };
    await expect(getExistingPageRefs(payload as never, single)).rejects.toThrow(
      "Connection refused"
    );
    expect(payload.find).toHaveBeenCalledTimes(1);
  });

  it("does not filter by _status when publishedOnly is false", async () => {
    const payload = fakePayload({ events: [{ id: 3 }] });
    const single: ResolvedPagesConfig = {
      ...cfg,
      collections: [{ slug: "events", publishedOnly: false }],
      syntheticRefs: [],
    };
    await getExistingPageRefs(payload as never, single);
    expect(payload.find.mock.calls[0][0].where).toBeUndefined();
  });
});
