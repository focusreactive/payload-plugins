import { beforeEach, describe, expect, it, vi } from "vitest";
import { setPluginConfig } from "../../../src/config";
import {
  KEYPHRASES_COLLECTION_SLUG,
  LINK_SOURCE_PAGE_SIZE,
  LINK_SUGGESTIONS_ENDPOINT_PATH,
  MAX_LINKED_DOCS,
  MAX_LINKED_HREFS,
  MAX_LINKED_HREF_LENGTH,
  MAX_LINK_TEXT_CHARS,
} from "../../../src/constants";
import { createLinkSuggestionsEndpoint } from "../../../src/server/links/endpoint";
import type { IndexRow, Where } from "../keyphrases/indexMatcher";
import { matchesWhere } from "../keyphrases/indexMatcher";

const topic = (n: number) => `topic${String(n).padStart(2, "0")}`;

const indexRow = (n: number, text = topic(n), locale = "en"): IndexRow => ({
  id: n,
  docCollection: "posts",
  docId: String(n),
  locale,
  keyphrases: [{ text, synonyms: [] }],
});

let indexRows: IndexRow[];
let unreadable: Set<string>;

type IdWhere = { id?: { in: string[] }; and?: IdWhere[] };

function idsOf(where: IdWhere): string[] {
  return where.id?.in ?? where.and?.flatMap(idsOf) ?? [];
}

interface FindArgs {
  collection: string;
  where: Where & IdWhere;
  page?: number;
  limit?: number;
}

function fakePayload() {
  return {
    config: { localization: false, admin: { user: "users" }, serverURL: "https://site.com" },
    logger: { warn: vi.fn() },
    collections: { posts: { config: { admin: { useAsTitle: "title" } } } },
    findByID: vi.fn(async ({ id }: { id: string }): Promise<{ id: string } | null> => ({ id })),
    find: vi.fn(async ({ collection, where, page, limit }: FindArgs) => {
      if (collection !== KEYPHRASES_COLLECTION_SLUG) {
        return {
          docs: idsOf(where)
            .filter((id) => !unreadable.has(id))
            .map((id) => ({ id: Number(id), title: `Post ${id}`, slug: `post-${id}` })),
        };
      }

      const matching = indexRows.filter((row) => matchesWhere(row, where));
      const start = ((page ?? 1) - 1) * (limit ?? matching.length);
      const end = limit ? start + limit : matching.length;

      return { docs: matching.slice(start, end), hasNextPage: end < matching.length };
    }),
  };
}

function fakeRequest(
  body: unknown,
  { user = { id: 1, collection: "users" } as unknown, payload = fakePayload() } = {}
) {
  return { user, json: async () => body, payload };
}

const endpoint = createLinkSuggestionsEndpoint({ collections: ["posts"], locales: ["en"] });
const handler = endpoint.handler as (req: unknown) => Promise<Response>;
const body = (extra: Record<string, unknown>) => ({
  collection: "posts",
  docId: "1",
  linkedHrefs: [],
  ...extra,
});

async function suggestionIds(res: Response): Promise<string[]> {
  const { suggestions } = (await res.json()) as { suggestions: { id: string }[] };
  return suggestions.map((s) => s.id);
}

function postLookups(payload: ReturnType<typeof fakePayload>) {
  return payload.find.mock.calls.filter(([args]) => args.collection === "posts");
}

const overCap = <T>(item: T, cap: number): T[] => Array.from({ length: cap + 1 }, () => item);

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

beforeEach(() => {
  indexRows = [indexRow(1, "self"), ...range(2, 80).map((n) => indexRow(n))];
  unreadable = new Set();
  setPluginConfig({
    collections: [
      {
        slug: "posts",
        extractContentPath: "@/x#default",
        resolveUrl: ({ doc }) => `/blog/${String(doc.slug)}`,
      },
    ],
    keyphraseIndex: true,
  });
});

describe("POST /seo/link-suggestions", () => {
  it("is a POST endpoint on the link suggestions path", () => {
    expect(endpoint).toMatchObject({ path: LINK_SUGGESTIONS_ENDPOINT_PATH, method: "post" });
  });

  it("returns 401 without a user before reading anything", async () => {
    const payload = fakePayload();
    const res = await handler(fakeRequest(body({ text: 1 }), { user: null, payload }));
    expect(res.status).toBe(401);
    expect(payload.find).not.toHaveBeenCalled();
    expect(payload.findByID).not.toHaveBeenCalled();
  });

  it("returns 403 for a user outside the admin user collection", async () => {
    const payload = fakePayload();
    const user = { id: 1, collection: "customers" };
    const res = await handler(fakeRequest(body({ text: "x" }), { user, payload }));
    expect(res.status).toBe(403);
    expect(payload.find).not.toHaveBeenCalled();
  });

  it("treats missing linked hrefs as none", async () => {
    const res = await handler(fakeRequest(body({ text: topic(2), linkedHrefs: undefined })));
    expect(res.status).toBe(200);
    expect(await suggestionIds(res)).toEqual(["2"]);
  });

  it("returns 401 without a user and 404 for an unreadable document", async () => {
    const valid = body({ text: "x" });
    expect((await handler(fakeRequest(valid, { user: null }))).status).toBe(401);

    const payload = fakePayload();
    payload.findByID.mockResolvedValueOnce(null);
    expect((await handler(fakeRequest(valid, { payload }))).status).toBe(404);
  });

  it.each([
    ["a non-string text", { text: 1 }],
    ["a text over the cap", { text: "a".repeat(MAX_LINK_TEXT_CHARS + 1) }],
    ["non-array hrefs", { text: "x", linkedHrefs: "/a" }],
    ["too many hrefs", { text: "x", linkedHrefs: overCap("/a", MAX_LINKED_HREFS) }],
    [
      "an href over the cap",
      { text: "x", linkedHrefs: [`/${"a".repeat(MAX_LINKED_HREF_LENGTH)}`] },
    ],
    ["a non-string href", { text: "x", linkedHrefs: [42] }],
    ["non-array linked docs", { text: "x", linkedDocs: "posts:2" }],
    [
      "too many linked docs",
      {
        text: "x",
        linkedDocs: overCap({ collection: "posts", docId: "2" }, MAX_LINKED_DOCS),
      },
    ],
  ])("rejects %s with 400 before checking access", async (_name, extra) => {
    const payload = fakePayload();
    const res = await handler(fakeRequest(body(extra), { payload }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request" });
    expect(payload.findByID).not.toHaveBeenCalled();
  });

  it("suggests other unlinked documents in the locale whose keyphrases appear in the text", async () => {
    indexRows = [
      indexRow(1, "self"),
      indexRow(2, "payload cms"),
      indexRow(3, "drafts"),
      indexRow(4, "ships", "de"),
    ];
    const res = await handler(
      fakeRequest(
        body({
          text: "Payload CMS ships drafts. Self.",
          linkedHrefs: ["https://site.com/blog/post-3/"],
        })
      )
    );
    expect(await res.json()).toEqual({
      suggestions: [
        {
          collection: "posts",
          id: "2",
          title: "Post 2",
          url: "/blog/post-2",
          phrase: "payload cms",
          count: 1,
          snippet: "Payload CMS ships drafts. Self.",
          snippetMatch: { start: 0, end: 11 },
        },
      ],
    });
  });

  describe("linked hrefs", () => {
    const resolveTo = (url: string, baseUrl?: string) =>
      setPluginConfig({
        site: { baseUrl },
        collections: [
          {
            slug: "posts",
            extractContentPath: "@/x#default",
            resolveUrl: ({ doc }) => (doc.id === 2 ? url : `/blog/${String(doc.slug)}`),
          },
        ],
        keyphraseIndex: true,
      });

    const suggestedWith = async (linkedHrefs: string[]) =>
      suggestionIds(await handler(fakeRequest(body({ text: topic(2), linkedHrefs }))));

    it("does not treat an external root link as a link to the home page", async () => {
      resolveTo("/");
      expect(await suggestedWith(["https://www.google.com"])).toEqual(["2"]);
    });

    it("does not treat an external link with the same path as a link to the target", async () => {
      resolveTo("/alpha");
      expect(await suggestedWith(["https://example.com/alpha"])).toEqual(["2"]);
    });

    it("treats relative and server-origin links with the same path as linked", async () => {
      resolveTo("/alpha");
      expect(await suggestedWith(["/alpha/"])).toEqual([]);
      expect(await suggestedWith(["https://site.com/alpha"])).toEqual([]);
    });

    it("treats links on the public site origin as linked", async () => {
      resolveTo("/alpha", "https://www.public.site/en");
      expect(await suggestedWith(["https://www.public.site/alpha"])).toEqual([]);
      expect(await suggestedWith(["https://other.site/alpha"])).toEqual(["2"]);
    });

    it("treats http, https and www. links to a known site as linked", async () => {
      resolveTo("/alpha", "https://www.public.site");
      expect(await suggestedWith(["http://site.com/alpha"])).toEqual([]);
      expect(await suggestedWith(["https://www.site.com/alpha"])).toEqual([]);
      expect(await suggestedWith(["http://public.site/alpha"])).toEqual([]);
    });

    it("treats links on the requested origin as linked when no site url is configured", async () => {
      resolveTo("/alpha", "");
      const payload = fakePayload();
      payload.config.serverURL = "";
      const request = {
        ...fakeRequest(body({ text: topic(2), linkedHrefs: ["https://cms.site/alpha"] }), {
          payload,
        }),
        origin: "https://cms.site",
      };
      expect(await suggestionIds(await handler(request))).toEqual([]);
    });

    it("treats links on the origin of an absolute target url as linked", async () => {
      resolveTo("https://public.site/alpha");
      expect(await suggestedWith(["https://public.site/alpha"])).toEqual([]);
      expect(await suggestedWith(["https://other.site/alpha"])).toEqual(["2"]);
    });
  });

  it("skips linked documents without looking them up", async () => {
    const payload = fakePayload();
    const res = await handler(
      fakeRequest(
        body({
          text: `${topic(2)} ${topic(3)}`,
          linkedDocs: [{ collection: "posts", docId: "2" }],
        }),
        { payload }
      )
    );
    expect(await suggestionIds(res)).toEqual(["3"]);
    expect(postLookups(payload).map(([args]) => idsOf(args.where))).toEqual([["3"]]);
  });

  it("drops an unreadable target and still returns ten suggestions", async () => {
    unreadable = new Set(["3"]);
    const text = range(2, 13).map(topic).join(" ");
    const ids = await suggestionIds(await handler(fakeRequest(body({ text }))));
    expect(ids).toEqual(["2", ...range(4, 12).map(String)]);
  });

  it("resolves further batches until ten suggestions are found", async () => {
    unreadable = new Set(range(2, 21).map(String));
    const payload = fakePayload();
    const text = range(2, 40).map(topic).join(" ");
    const ids = await suggestionIds(await handler(fakeRequest(body({ text }), { payload })));
    expect(ids).toEqual(range(22, 31).map(String));
    expect(postLookups(payload)).toHaveLength(2);
  });

  it("keeps resolving past many unreadable targets", async () => {
    unreadable = new Set(range(2, 71).map(String));
    const text = range(2, 80).map(topic).join(" ");
    const ids = await suggestionIds(await handler(fakeRequest(body({ text }))));
    expect(ids).toEqual(range(72, 80).map(String));
  });

  it("stops after resolving a bounded number of targets", async () => {
    indexRows = [indexRow(1, "self"), ...range(2, 400).map((n) => indexRow(n))];
    unreadable = new Set(range(2, 400).map(String));
    const payload = fakePayload();
    const text = range(2, 400).map(topic).join(" ");
    const ids = await suggestionIds(await handler(fakeRequest(body({ text }), { payload })));
    expect(ids).toEqual([]);
    expect(postLookups(payload).map(([args]) => idsOf(args.where).length)).toEqual([
      20, 40, 80, 160,
    ]);
  });

  it("reads the index page by page", async () => {
    const lastPageRow = LINK_SOURCE_PAGE_SIZE + 50;
    indexRows = [indexRow(1, "self"), ...range(2, lastPageRow).map((n) => indexRow(n))];
    const payload = fakePayload();
    const ids = await suggestionIds(
      await handler(fakeRequest(body({ text: topic(lastPageRow) }), { payload }))
    );
    expect(ids).toEqual([String(lastPageRow)]);
    const indexReads = payload.find.mock.calls.filter(
      ([args]) => args.collection === KEYPHRASES_COLLECTION_SLUG
    );
    expect(indexReads.map(([args]) => [args.page, args.limit])).toEqual([
      [1, LINK_SOURCE_PAGE_SIZE],
      [2, LINK_SOURCE_PAGE_SIZE],
    ]);
  });

  it("reads only the needed index fields unrestricted and the targets as the caller", async () => {
    const payload = fakePayload();
    await handler(fakeRequest(body({ text: topic(2) }), { payload }));
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: KEYPHRASES_COLLECTION_SLUG,
        overrideAccess: true,
        limit: LINK_SOURCE_PAGE_SIZE,
        select: { docCollection: true, docId: true, keyphrases: true },
      })
    );
    expect(payload.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ collection: "posts", overrideAccess: false })
    );
  });
});
