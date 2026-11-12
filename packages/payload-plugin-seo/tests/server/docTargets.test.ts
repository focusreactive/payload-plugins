import type { PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";
import type { DocTarget } from "../../src/keyphrases/docTarget";
import { findReadableDocs } from "../../src/server/docTargets";

function fakeRequest() {
  const find = vi.fn(
    async ({ collection, where }: { collection: string; where: { id: { in: string[] } } }) => ({
      docs: (collection === "page" ? [{ id: 7, title: "Home" }] : [{ id: 2, name: "" }]).filter(
        (d) => where.id.in.includes(String(d.id))
      ),
    })
  );
  const payload = {
    find,
    collections: {
      page: { config: { admin: { useAsTitle: "title" } } },
      posts: { config: { admin: { useAsTitle: "name" } } },
    },
  };
  return { find, req: { payload } as unknown as PayloadRequest };
}

async function resolveTitles(req: PayloadRequest, targets: DocTarget[]) {
  const found = await findReadableDocs(req, targets, { locale: "en", titleOnly: true });

  return found.map(({ summary }) => summary);
}

describe("findReadableDocs", () => {
  it("returns titles per collection and falls back to the id", async () => {
    const { find, req } = fakeRequest();
    const docs = await resolveTitles(req, [
      { collection: "page", docId: "7" },
      { collection: "posts", docId: "2" },
    ]);
    expect(docs).toEqual([
      { collection: "page", id: "7", title: "Home" },
      { collection: "posts", id: "2", title: "2" },
    ]);
    expect(find).toHaveBeenCalledTimes(2);
    expect(find.mock.calls[0]?.[0]).toMatchObject({
      collection: "page",
      where: { id: { in: ["7"] } },
      locale: "en",
      select: { title: true },
      overrideAccess: false,
      req,
    });
  });

  it("drops documents that do not exist or the caller cannot read", async () => {
    const { req } = fakeRequest();
    const docs = await resolveTitles(req, [{ collection: "page", docId: "99" }]);
    expect(docs).toEqual([]);
  });

  it("does not query when there is nothing to resolve", async () => {
    const { find, req } = fakeRequest();
    expect(await resolveTitles(req, [])).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });
});
