import { describe, expect, it, vi } from "vitest";
import { createServerResolveDocs } from "../../../src/server/generate/serverResolveDocs";

function fakePayload(docsByCollection: Record<string, Array<{ id: number | string }>>) {
  return {
    find: vi.fn(async ({ collection }: { collection: string }) => ({
      docs: docsByCollection[collection] ?? [],
    })),
  } as never;
}

describe("createServerResolveDocs", () => {
  it("resolves docs by collection + id", async () => {
    const payload = fakePayload({ media: [{ id: 1, url: "/a.jpg" } as never] });
    const store = await createServerResolveDocs(
      payload,
      undefined
    )([{ collection: "media", ids: [1] }]);
    expect(store.get("media", 1)).toMatchObject({ url: "/a.jpg" });
  });
  it("returns undefined for missing ids and skips empty queries", async () => {
    const payload = fakePayload({});
    const store = await createServerResolveDocs(payload, "en")([{ collection: "media", ids: [] }]);
    expect(store.get("media", 99)).toBeUndefined();
    expect((payload as { find: ReturnType<typeof vi.fn> }).find).not.toHaveBeenCalled();
  });
});
