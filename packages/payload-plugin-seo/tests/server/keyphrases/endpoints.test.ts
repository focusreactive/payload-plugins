import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  KEYPHRASES_COLLECTION_SLUG,
  KEYPHRASES_ENDPOINT_PATH,
  KEYPHRASE_USAGE_ENDPOINT_PATH,
} from "../../../src/constants";
import { createKeyphraseEndpoints } from "../../../src/server/keyphrases/endpoints";
import type { IndexRow, Where } from "./indexMatcher";
import { matchesWhere } from "./indexMatcher";

let rows: IndexRow[];

const ADMIN_USER = { id: 1, collection: "users" };

type UpdateAccess = (args: { id?: string | number }) => boolean | Where;

function fakePayload({ localeCodes }: { localeCodes?: string[] } = {}) {
  return {
    config: { localization: localeCodes ? { localeCodes } : false, admin: { user: "users" } },
    logger: { warn: vi.fn() },
    find: vi.fn(async ({ collection, where }: { collection: string; where: Where }) => {
      if (collection === KEYPHRASES_COLLECTION_SLUG) {
        return { docs: rows.filter((r) => matchesWhere(r, where)) };
      }
      return { docs: [{ id: 2, title: "Post two" }] };
    }),
    findByID: vi.fn(
      async ({ id }: { id: string }): Promise<{ id: string | number } | null> => ({ id })
    ),
    create: vi.fn(async ({ data }: { data: Omit<IndexRow, "id"> }) => ({ id: 100, ...data })),
    update: vi.fn(async ({ data }: { data: Partial<IndexRow> }) => data),
    delete: vi.fn(async () => ({ docs: [] })),
    collections: {
      posts: {
        config: {
          admin: { useAsTitle: "title" },
          access: { update: vi.fn<UpdateAccess>(() => true) },
        },
      },
    },
  };
}

function handler(path: string, method: string, collections = ["posts"]) {
  const endpoint = createKeyphraseEndpoints({ collections, locales: ["en", "fr"] }).find(
    (e) => e.path === path && e.method === method
  );
  if (!endpoint) throw new Error(`no ${method} ${path}`);
  return endpoint.handler as (req: unknown) => Promise<Response>;
}

const getKeyphrases = () => handler(KEYPHRASES_ENDPOINT_PATH, "get");
const putKeyphrases = () => handler(KEYPHRASES_ENDPOINT_PATH, "put");
const getUsage = () => handler(KEYPHRASE_USAGE_ENDPOINT_PATH, "get");

const ref = { collection: "posts", docId: "1", locale: "en" };

function rowRef(docId: string) {
  return { docCollection: "posts", docId, locale: "en" };
}

const queryRequest = (query: Record<string, unknown>, payload = fakePayload()) => ({
  user: ADMIN_USER,
  query,
  payload,
});

const putRequest = (body: unknown, payload = fakePayload()) => ({
  user: ADMIN_USER,
  json: async () => body,
  payload,
});

beforeEach(() => {
  rows = [];
});

describe("request authorization", () => {
  const cases = [
    ["GET keyphrases", getKeyphrases, (r: object) => ({ ...r, query: ref })],
    [
      "PUT keyphrases",
      putKeyphrases,
      (r: object) => ({ ...r, json: async () => ({ ...ref, keyphrases: [] }) }),
    ],
    ["GET usage", getUsage, (r: object) => ({ ...r, query: { ...ref, phrase: "a" } })],
  ] as const;

  for (const [name, endpoint, withInput] of cases) {
    it(`${name} returns 401 without a user`, async () => {
      const res = await endpoint()(withInput({ payload: fakePayload() }));
      expect(res.status).toBe(401);
    });

    it(`${name} returns 404 when the caller cannot read the document`, async () => {
      const payload = fakePayload();
      payload.findByID.mockResolvedValueOnce(null);
      const res = await endpoint()(withInput({ user: ADMIN_USER, payload }));
      expect(res.status).toBe(404);
    });

    it(`${name} returns 403 for a user outside the admin user collection`, async () => {
      const payload = fakePayload();
      const res = await endpoint()(
        withInput({ user: { id: 1, collection: "customers" }, payload })
      );
      expect(res.status).toBe(403);
      expect(payload.findByID).not.toHaveBeenCalled();
    });

    it(`${name} returns 400 for a locale that is not configured`, async () => {
      const payload = fakePayload({ localeCodes: ["de"] });
      const res = await endpoint()(withInput({ user: ADMIN_USER, payload }));
      expect(res.status).toBe(400);
    });
  }

  it("checks read access on the target document as the caller", async () => {
    const payload = fakePayload();
    await getKeyphrases()(queryRequest(ref, payload));
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "posts",
        id: "1",
        overrideAccess: false,
        disableErrors: true,
      })
    );
  });

  it("logs and returns 404 when the document lookup throws", async () => {
    const payload = fakePayload();
    const error = new Error("invalid id");
    payload.findByID.mockRejectedValueOnce(error);
    expect((await getKeyphrases()(queryRequest(ref, payload))).status).toBe(404);
    expect(payload.logger.warn).toHaveBeenCalledWith(
      { err: error },
      "[payload-plugin-seo] keyphrase access check failed"
    );
  });

  it("stores the id of the document found rather than the id as sent", async () => {
    const payload = fakePayload();
    payload.findByID.mockResolvedValueOnce({ id: 1 });
    const res = await putKeyphrases()(
      putRequest({ ...ref, docId: "01", keyphrases: [{ text: "a", synonyms: [] }] }, payload)
    );
    expect(res.status).toBe(200);
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ docId: "1" }) })
    );
  });

  it("stores under the first supported locale when localization is off and no locale is sent", async () => {
    const payload = fakePayload();
    const { locale: _locale, ...withoutLocale } = ref;
    const res = await putKeyphrases()(
      putRequest({ ...withoutLocale, keyphrases: [{ text: "a", synonyms: [] }] }, payload)
    );
    expect(res.status).toBe(200);
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locale: "en" }) })
    );
  });

  it("ignores the sent locale when localization is off", async () => {
    const payload = fakePayload();
    const res = await putKeyphrases()(
      putRequest({ ...ref, locale: "xx", keyphrases: [{ text: "a", synonyms: [] }] }, payload)
    );
    expect(res.status).toBe(200);
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locale: "en" }) })
    );
  });

  it("returns 400 for a missing locale when localization is on", async () => {
    const payload = fakePayload({ localeCodes: ["en", "de"] });
    const { locale: _locale, ...withoutLocale } = ref;
    expect((await getKeyphrases()(queryRequest(withoutLocale, payload))).status).toBe(400);
  });

  it("accepts a configured locale when localization is on", async () => {
    const payload = fakePayload({ localeCodes: ["en", "de"] });
    expect((await getKeyphrases()(queryRequest(ref, payload))).status).toBe(200);
  });
});

describe("update access", () => {
  const putBody = { ...ref, keyphrases: [{ text: "a", synonyms: [] }] };

  it("returns 403 when the caller can read but not update the document", async () => {
    const payload = fakePayload();
    payload.collections.posts.config.access.update.mockReturnValueOnce(false);
    const res = await putKeyphrases()(putRequest(putBody, payload));
    expect(res.status).toBe(403);
    expect(payload.create).not.toHaveBeenCalled();
  });

  it("returns 404 before checking update access when the caller cannot read the document", async () => {
    const payload = fakePayload();
    payload.findByID.mockResolvedValueOnce(null);
    const res = await putKeyphrases()(putRequest(putBody, payload));
    expect(res.status).toBe(404);
    expect(payload.collections.posts.config.access.update).not.toHaveBeenCalled();
  });

  it("evaluates the collection update access for the target document", async () => {
    const payload = fakePayload();
    await putKeyphrases()(putRequest(putBody, payload));
    expect(payload.collections.posts.config.access.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "1" })
    );
  });

  it("matches a query-based update access against the target document", async () => {
    const payload = fakePayload();
    const constraint: Where = { owner: { equals: 1 } };
    payload.collections.posts.config.access.update.mockReturnValueOnce(constraint);
    const res = await putKeyphrases()(putRequest(putBody, payload));
    expect(res.status).toBe(200);
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "posts",
        where: { and: [{ id: { equals: "1" } }, constraint] },
        limit: 1,
        overrideAccess: true,
        locale: "en",
      })
    );
  });

  it("returns 403 when the query-based update access excludes the document", async () => {
    const payload = fakePayload();
    payload.collections.posts.config.access.update.mockReturnValueOnce({ owner: { equals: 2 } });
    payload.find.mockResolvedValueOnce({ docs: [] });
    const res = await putKeyphrases()(putRequest(putBody, payload));
    expect(res.status).toBe(403);
  });

  it("reports whether the caller can update the document when reading keyphrases", async () => {
    const payload = fakePayload();
    expect(await (await getKeyphrases()(queryRequest(ref, payload))).json()).toMatchObject({
      canUpdate: true,
    });

    payload.collections.posts.config.access.update.mockReturnValueOnce(false);
    expect(await (await getKeyphrases()(queryRequest(ref, payload))).json()).toMatchObject({
      canUpdate: false,
    });
  });

  it("does not require update access to read keyphrases or usage", async () => {
    const payload = fakePayload();
    payload.collections.posts.config.access.update.mockReturnValue(false);
    expect((await getKeyphrases()(queryRequest(ref, payload))).status).toBe(200);
    expect((await getUsage()(queryRequest({ ...ref, phrase: "a" }, payload))).status).toBe(200);
  });
});

describe("GET /seo/keyphrases", () => {
  it("returns 400 for an unknown collection", async () => {
    const res = await getKeyphrases()(queryRequest({ ...ref, collection: "users" }));
    expect(res.status).toBe(400);
  });

  it("returns the stored keyphrases, or [] when there is no row", async () => {
    rows = [{ id: 1, ...rowRef("1"), keyphrases: [{ text: "a", synonyms: [] }] }];

    expect(await (await getKeyphrases()(queryRequest(ref))).json()).toEqual({
      keyphrases: [{ text: "a", synonyms: [] }],
      indexed: true,
      canUpdate: true,
    });
    expect(await (await getKeyphrases()(queryRequest({ ...ref, docId: "2" }))).json()).toEqual({
      keyphrases: [],
      indexed: false,
      canUpdate: true,
    });
  });

  it("reports a row whose keyphrases were all removed as indexed", async () => {
    rows = [{ id: 1, ...rowRef("1"), keyphrases: [] }];
    expect(await (await getKeyphrases()(queryRequest(ref))).json()).toEqual({
      keyphrases: [],
      indexed: true,
      canUpdate: true,
    });
  });
});

describe("PUT /seo/keyphrases", () => {
  it("creates a row with the keyphrase intents when none exists", async () => {
    const payload = fakePayload();
    const res = await putKeyphrases()(
      putRequest(
        {
          ...ref,
          keyphrases: [
            { text: "Payload CMS", synonyms: ["b"] },
            { text: "cms payload", synonyms: [] },
          ],
        },
        payload
      )
    );
    expect(res.status).toBe(200);
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: KEYPHRASES_COLLECTION_SLUG,
        data: {
          ...rowRef("1"),
          keyphrases: [
            { text: "Payload CMS", synonyms: ["b"] },
            { text: "cms payload", synonyms: [] },
          ],
          intents: ["cms payload"],
        },
      })
    );
  });

  it("updates the existing row", async () => {
    rows = [{ id: 5, ...rowRef("1"), keyphrases: [] }];
    const payload = fakePayload();
    await putKeyphrases()(putRequest({ ...ref, keyphrases: [{ text: "z" }] }, payload));
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 5,
        data: { keyphrases: [{ text: "z", synonyms: [] }], intents: ["z"] },
      })
    );
  });

  it("keeps the row with an empty list when the list becomes empty", async () => {
    rows = [{ id: 5, ...rowRef("1"), keyphrases: [{ text: "a", synonyms: [] }] }];
    const payload = fakePayload();
    await putKeyphrases()(putRequest({ ...ref, keyphrases: [] }, payload));
    expect(payload.delete).not.toHaveBeenCalled();
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, data: { keyphrases: [], intents: [] } })
    );
  });

  it("neither deletes nor creates for an empty list without a row", async () => {
    const payload = fakePayload();
    const res = await putKeyphrases()(putRequest({ ...ref, keyphrases: [] }, payload));
    expect(res.status).toBe(200);
    expect(payload.delete).not.toHaveBeenCalled();
    expect(payload.create).not.toHaveBeenCalled();
  });

  it("leaves an existing row alone when asked to create only", async () => {
    rows = [{ id: 5, ...rowRef("1"), keyphrases: [{ text: "server", synonyms: [] }] }];
    const payload = fakePayload();
    const res = await putKeyphrases()(
      putRequest({ ...ref, ifAbsent: true, keyphrases: [{ text: "local" }] }, payload)
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ keyphrases: [{ text: "server", synonyms: [] }] });
    expect(payload.update).not.toHaveBeenCalled();
    expect(payload.create).not.toHaveBeenCalled();
  });

  it("creates the row when asked to create only and none exists", async () => {
    const payload = fakePayload();
    const res = await putKeyphrases()(
      putRequest({ ...ref, ifAbsent: true, keyphrases: [{ text: "local" }] }, payload)
    );
    expect(res.status).toBe(200);
    expect(payload.create).toHaveBeenCalledTimes(1);
  });

  describe("when another request creates the row first", () => {
    function racingPayload() {
      const payload = fakePayload();
      payload.create.mockImplementationOnce(async () => {
        rows.push({ id: 9, ...rowRef("1"), keyphrases: [{ text: "first", synonyms: [] }] });
        throw new Error("duplicate key value violates unique constraint");
      });
      return payload;
    }

    it("updates the row the other request created", async () => {
      const payload = racingPayload();
      const res = await putKeyphrases()(
        putRequest({ ...ref, keyphrases: [{ text: "b" }] }, payload)
      );
      expect(res.status).toBe(200);
      expect(payload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 9,
          data: { keyphrases: [{ text: "b", synonyms: [] }], intents: ["b"] },
        })
      );
    });

    it("returns the stored keyphrases with 409 when asked to create only", async () => {
      const payload = racingPayload();
      const res = await putKeyphrases()(
        putRequest({ ...ref, ifAbsent: true, keyphrases: [{ text: "b" }] }, payload)
      );
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ keyphrases: [{ text: "first", synonyms: [] }] });
      expect(payload.update).not.toHaveBeenCalled();
    });

    it("rethrows when the row still does not exist", async () => {
      const payload = fakePayload();
      payload.create.mockRejectedValueOnce(new Error("db down"));
      await expect(
        putKeyphrases()(putRequest({ ...ref, keyphrases: [{ text: "b" }] }, payload))
      ).rejects.toThrow("db down");
    });
  });

  it("returns 400 for a bad body", async () => {
    expect((await putKeyphrases()(putRequest({ docId: "1" }))).status).toBe(400);
    expect((await putKeyphrases()(putRequest({ ...ref, keyphrases: "a" }))).status).toBe(400);
  });
});

describe("GET /seo/keyphrase-usage", () => {
  it("returns other documents whose keyphrases share the intent", async () => {
    rows = [
      { id: 1, ...rowRef("1"), keyphrases: [], intents: ["cms payload"] },
      { id: 2, ...rowRef("2"), keyphrases: [], intents: ["headless", "cms payload"] },
      { id: 3, ...rowRef("3"), keyphrases: [], intents: ["other"] },
      { id: 4, ...rowRef("4"), locale: "de", keyphrases: [], intents: ["cms payload"] },
      { id: 5, ...rowRef("5"), docCollection: "media", keyphrases: [], intents: ["cms payload"] },
    ];
    const payload = fakePayload();
    const res = await getUsage()(queryRequest({ ...ref, phrase: "Payload  CMS" }, payload));

    expect(await res.json()).toEqual({
      docs: [{ collection: "posts", id: "2", title: "Post two" }],
    });
    expect(payload.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        collection: "posts",
        where: { id: { in: ["2"] } },
        overrideAccess: false,
      })
    );
  });

  it("keeps a row with the same id in another collection when excluding the document itself", async () => {
    rows = [{ id: 1, ...rowRef("1"), keyphrases: [], intents: ["a"] }];
    const payload = fakePayload();
    const usage = handler(KEYPHRASE_USAGE_ENDPOINT_PATH, "get", ["posts", "page"]);

    await usage(queryRequest({ ...ref, collection: "page", phrase: "a" }, payload));

    expect(payload.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ collection: "posts", where: { id: { in: ["1"] } } })
    );
  });

  it("returns no docs for a blank phrase", async () => {
    const res = await getUsage()(queryRequest({ ...ref, phrase: " " }));
    expect(await res.json()).toEqual({ docs: [] });
  });
});
