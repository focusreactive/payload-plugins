import type { PayloadRequest } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setPluginConfig } from "../../../src/config";
import { resolveLinkTargets } from "../../../src/server/links/resolveLinkTargets";
import { idsOf } from "../fixtures/indexMatcher";
import type { Where } from "../fixtures/indexMatcher";

const docs: Record<string, Record<string, unknown>[]> = {
  posts: [{ id: 2, title: "Post two", slug: "post-two" }],
  page: [{ id: 7, title: "About", slug: "about" }],
};

function fakeRequest() {
  const find = vi.fn(async ({ collection, where }: { collection: string; where: Where }) => ({
    docs: (docs[collection] ?? []).filter((d) => idsOf(where).includes(String(d.id))),
  }));
  const warn = vi.fn();
  const payload = {
    find,
    logger: { warn },
    collections: {
      posts: { config: { admin: { useAsTitle: "title" } } },
      page: { config: { admin: { useAsTitle: "title" }, versions: { drafts: false } } },
      articles: { config: { admin: { useAsTitle: "title" }, versions: { drafts: true } } },
    },
  };
  return { find, warn, req: { payload } as unknown as PayloadRequest };
}

const candidate = (collection: string, docId: string) => ({
  collection,
  docId,
  phrase: "p",
  count: 1,
  snippet: "s",
  snippetMatch: { start: 0, end: 1 },
});

const suggestion = (collection: string, id: string) => ({
  collection,
  id,
  phrase: "p",
  count: 1,
  snippet: "s",
  snippetMatch: { start: 0, end: 1 },
});

beforeEach(() => {
  setPluginConfig({
    collections: [
      {
        slug: "posts",
        extractContentPath: "@/x#default",
        resolveUrl: ({ doc, locale }) => `/${locale}/blog/${String(doc.slug)}`,
      },
      { slug: "page", extractContentPath: "@/y#default" },
    ],
    keyphraseIndex: true,
  });
});

describe("resolveLinkTargets", () => {
  it("adds title and resolved url, keeping candidate order", async () => {
    const { req } = fakeRequest();
    const result = await resolveLinkTargets(
      req,
      [candidate("page", "7"), candidate("posts", "2")],
      "en"
    );
    expect(result).toEqual([
      { ...suggestion("page", "7"), title: "About", url: null },
      { ...suggestion("posts", "2"), title: "Post two", url: "/en/blog/post-two" },
    ]);
  });

  it("loads targets with the caller's access", async () => {
    const { find, req } = fakeRequest();
    await resolveLinkTargets(req, [candidate("posts", "2")], "en");
    expect(find.mock.calls[0]?.[0]).toMatchObject({
      collection: "posts",
      where: { id: { in: ["2"] } },
      locale: "en",
      overrideAccess: false,
      req,
    });
  });

  it("drops candidates whose document is gone or unreadable", async () => {
    const { req } = fakeRequest();
    expect(await resolveLinkTargets(req, [candidate("posts", "99")], "en")).toEqual([]);
  });

  it("treats a throwing resolveUrl as no url and logs it", async () => {
    setPluginConfig({
      collections: [
        {
          slug: "posts",
          extractContentPath: "@/x#default",
          resolveUrl: () => {
            throw new Error("x");
          },
        },
      ],
      keyphraseIndex: true,
    });
    const { req, warn } = fakeRequest();
    const [hit] = await resolveLinkTargets(req, [candidate("posts", "2")], "en");
    expect(hit.url).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("only suggests published documents of collections with drafts", async () => {
    const { find, req } = fakeRequest();
    await resolveLinkTargets(req, [candidate("articles", "5"), candidate("page", "7")], "en");
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "articles",
        where: { and: [{ id: { in: ["5"] } }, { _status: { equals: "published" } }] },
      })
    );
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "page", where: { id: { in: ["7"] } } })
    );
  });
});
