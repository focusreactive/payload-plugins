import type { Config, FieldHook, Payload, PayloadRequest } from "payload";

import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { buildConfig, createLocalReq, getPayload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { visualEditingPlugin } from "../../src/index";
import { everyMarkedTextIn, everyMetaIn } from "../support/markedData";
import { START_TIMEOUT_MS } from "../support/realPayload";

type NestedRead = (req: PayloadRequest) => Promise<unknown>;

const MISSING_ID = 999_999;

const ignoreFailure = (): undefined => undefined;

const expectUnmarked = (read: unknown) => {
  expect(everyMarkedTextIn(read)).toEqual([]);
  expect(everyMetaIn(read)).toEqual([]);
};

const expectMarked = (read: unknown) => {
  expect(everyMarkedTextIn(read)).not.toEqual([]);
};

const whileDenied = async <Value>(
  deny: (denied: boolean) => void,
  read: () => Promise<Value>
): Promise<Value> => {
  deny(true);
  try {
    return await read();
  } finally {
    deny(false);
  }
};

const withArgsCopiedBeforeEveryPostsOperation = (config: Config): Config => ({
  ...config,
  collections: config.collections?.map((collection) =>
    collection.slug === "posts"
      ? {
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeOperation: [
              ...(collection.hooks?.beforeOperation ?? []),
              ({ args }) => ({ ...args }),
            ],
          },
        }
      : collection
  ),
});

describe("whether a read through Payload is marked", () => {
  let payload: Payload;
  let pageId: number | string;
  let postId: number | string;
  let deniesPages = false;
  let deniesSettings = false;
  const nestedReads: Record<"pages" | "posts" | "settings", NestedRead | null> = {
    pages: null,
    posts: null,
    settings: null,
  };

  const runNestedRead =
    (slug: keyof typeof nestedReads): FieldHook =>
    async ({ req, value }) => {
      const nestedRead = nestedReads[slug];
      nestedReads[slug] = null;
      if (nestedRead) await nestedRead(req);
      return value;
    };

  const denyPages = (denied: boolean) => {
    deniesPages = denied;
  };

  const denySettings = (denied: boolean) => {
    deniesSettings = denied;
  };

  const readPage = (options: Omit<Parameters<Payload["findByID"]>[0], "collection" | "id"> = {}) =>
    payload.findByID({ collection: "pages", depth: 0, id: pageId, ...options });

  const readSettings = (options: Omit<Parameters<Payload["findGlobal"]>[0], "slug"> = {}) =>
    payload.findGlobal({ slug: "settings", ...options });

  beforeAll(async () => {
    const config = await buildConfig({
      collections: [
        {
          slug: "pages",
          access: { read: () => !deniesPages },
          fields: [{ hooks: { afterRead: [runNestedRead("pages")] }, name: "title", type: "text" }],
          versions: { drafts: true },
        },
        {
          slug: "posts",
          fields: [
            { hooks: { afterRead: [runNestedRead("posts")] }, name: "title", type: "text" },
            { name: "page", relationTo: "pages", type: "relationship" },
          ],
          versions: { drafts: true },
        },
      ],
      db: sqliteAdapter({ client: { url: ":memory:" } }),
      globals: [
        {
          slug: "settings",
          access: { read: () => !deniesSettings },
          fields: [
            { hooks: { afterRead: [runNestedRead("settings")] }, name: "siteName", type: "text" },
          ],
          versions: { drafts: true },
        },
      ],
      plugins: [visualEditingPlugin(), withArgsCopiedBeforeEveryPostsOperation],
      secret: "draft-reads-test",
      telemetry: false,
      typescript: { autoGenerate: false },
    });
    payload = await getPayload({ config, key: "draft-reads" });
    const page = await payload.create({
      collection: "pages",
      data: { _status: "published", title: "Home" },
    });
    pageId = page.id;
    const post = await payload.create({
      collection: "posts",
      data: { _status: "published", page: page.id, title: "Post" },
    });
    postId = post.id;
    await payload.updateGlobal({
      data: { _status: "published", siteName: "Acme" },
      slug: "settings",
    });
    await payload.updateGlobal({ data: { siteName: "Acme draft" }, draft: true, slug: "settings" });
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  afterEach(() => {
    expect(nestedReads).toEqual({ pages: null, posts: null, settings: null });
  });

  describe("one read at a time", () => {
    it("marks draft reads of a collection and a global and nothing in published ones", async () => {
      expectMarked(await readPage({ draft: true }));
      expectMarked(await readSettings({ draft: true }));
      expectUnmarked(await readPage());
      expectUnmarked(await readSettings());
    });

    it("marks the populated document of a draft read and nothing in a published one", async () => {
      const read = (draft: boolean) =>
        payload.findByID({ collection: "posts", depth: 1, draft, id: postId });

      expectMarked((await read(true)).page);
      expectUnmarked(await read(false));
    });

    it("marks nothing in the version reads of a global after its draft read in the same request", async () => {
      const req = await createLocalReq({}, payload);
      const draft = await readSettings({ draft: true, req });
      const versions = await payload.findGlobalVersions({ req, slug: "settings" });
      const version = await payload.findGlobalVersionByID({
        id: String(versions.docs[0]?.id),
        req,
        slug: "settings",
      });

      expectMarked(draft);
      expectUnmarked(versions.docs);
      expectUnmarked(version);
    });

    it("keeps marking a draft read of a global after counts, version reads and a write in the same request", async () => {
      const req = await createLocalReq({}, payload);
      await payload.countGlobalVersions({ global: "settings", req });
      await payload.findGlobalVersions({ req, slug: "settings" });
      await payload.updateGlobal({
        data: { siteName: "Acme draft" },
        draft: true,
        req,
        slug: "settings",
      });

      expectMarked(await readSettings({ draft: true, req }));
    });

    it("marks nothing in a published read after a draft read that failed in the same request", async () => {
      const req = await createLocalReq({}, payload);
      await payload
        .findByID({ collection: "pages", draft: true, id: MISSING_ID, req })
        .catch(ignoreFailure);

      expectUnmarked(await readPage({ req }));
    });
  });

  describe("a draft read nested in a published read", () => {
    it("of the same global, denied with disableErrors, leaves the outer read unmarked", async () => {
      nestedReads.settings = (req) =>
        whileDenied(denySettings, () =>
          readSettings({ draft: true, req, disableErrors: true, overrideAccess: false })
        );

      expectUnmarked(await readSettings());
    });

    it("of the same global, which throws, leaves the outer read unmarked", async () => {
      nestedReads.settings = (req) =>
        whileDenied(denySettings, () =>
          readSettings({ draft: true, req, overrideAccess: false }).catch(ignoreFailure)
        );

      expectUnmarked(await readSettings());
    });

    it("of the same collection, which throws, leaves the outer read unmarked", async () => {
      nestedReads.pages = (req) =>
        payload
          .findByID({ collection: "pages", depth: 0, draft: true, id: MISSING_ID, req })
          .catch(ignoreFailure);

      expectUnmarked(await readPage());
    });

    it("of the same collection, denied with disableErrors, leaves the outer find unmarked", async () => {
      nestedReads.pages = (req) =>
        whileDenied(denyPages, () =>
          payload.find({
            collection: "pages",
            depth: 0,
            disableErrors: true,
            draft: true,
            overrideAccess: false,
            req,
          })
        );

      expectUnmarked((await payload.find({ collection: "pages" })).docs);
    });

    it("of a collection whose operations get copied args leaves the outer find unmarked", async () => {
      nestedReads.posts = (req) =>
        payload
          .findByID({ collection: "posts", depth: 0, draft: true, id: MISSING_ID, req })
          .catch(ignoreFailure);

      expectUnmarked((await payload.find({ collection: "posts" })).docs);
    });
  });

  describe("a published read nested in a draft read", () => {
    it("of the same global, denied, leaves the outer read marked", async () => {
      nestedReads.settings = (req) =>
        whileDenied(denySettings, () =>
          readSettings({ draft: true, req, disableErrors: true, overrideAccess: false })
        );

      expectMarked(await readSettings({ draft: true }));
    });

    it("of the same collection leaves the outer read marked", async () => {
      nestedReads.pages = (req) => readPage({ req });

      expectMarked(await readPage({ draft: true }));
    });
  });

  describe("reads at the same time", () => {
    it("on one request mark the draft read of a collection and nothing in the published one", async () => {
      const req = await createLocalReq({}, payload);
      const [draft, published] = await Promise.all([
        payload.find({ collection: "pages", draft: true, req }),
        payload.find({ collection: "pages", req }),
      ]);
      const [publishedFirst, draftSecond] = await Promise.all([
        payload.find({ collection: "pages", req }),
        payload.find({ collection: "pages", draft: true, req }),
      ]);

      expectMarked(draft.docs);
      expectUnmarked(published.docs);
      expectUnmarked(publishedFirst.docs);
      expectMarked(draftSecond.docs);
    });

    it("on one request mark nothing in either read of the same global, the one case that fails closed", async () => {
      const req = await createLocalReq({}, payload);
      const [draft, published] = await Promise.all([
        readSettings({ draft: true, req }),
        readSettings({ req }),
      ]);

      expectUnmarked(published);
      expectUnmarked(draft);
    });

    it("with one shared context object mark the draft reads and nothing in the published ones", async () => {
      const context = {};
      const [draftSettings, publishedSettings] = await Promise.all([
        readSettings({ context, draft: true }),
        readSettings({ context }),
      ]);
      const [publishedPage, draftPage] = await Promise.all([
        readPage({ context }),
        readPage({ context, draft: true }),
      ]);

      expectMarked(draftSettings);
      expectUnmarked(publishedSettings);
      expectUnmarked(publishedPage);
      expectMarked(draftPage);
      expect(context).toEqual({});
    });
  });
});
