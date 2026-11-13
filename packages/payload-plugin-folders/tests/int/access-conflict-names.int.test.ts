import type { Access, Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { MovePreview } from "../../src/core/move.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { clearTree, seedTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

type ErrorBody = {
  errors: Array<{
    data?: { blocked?: Array<{ message: string }>; count?: number; items?: unknown[] };
    message: string;
  }>;
};

const password = "test-password";
const drafter = { email: "names-drafter@example.com", password };
const editor = { email: "names-editor@example.com", password };

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
  for (const [user, role] of [
    [drafter, "drafter"],
    [editor, "editor"],
  ] as const) {
    await harness.payload.create({
      collection: "users",
      data: { email: user.email, password, role } as never,
      overrideAccess: true,
    });
  }
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await clearTree(harness.payload);
});

const call = <TBody>(
  method: "GET" | "POST",
  path: string,
  user: { email: string; password: string },
  body?: unknown
) =>
  callEndpoint<TBody>({
    ...(body === undefined ? {} : { body }),
    config: harness.config,
    method,
    path,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
    user,
  });

/**
 * The listed users cannot read the documents `hiddenFor` names, by id; everyone else reads all.
 * `calls` counts how often the function ran.
 */
const withRead = async (
  collection: "pages" | "posts",
  hiddenFor: { email: string },
  hiddenIds: Array<number | string>,
  work: (calls: { count: number }) => Promise<void>
): Promise<void> => {
  const { config } = harness.payload.collections[collection];
  const original = config.access.read;
  const calls = { count: 0 };
  const hide: Access = ({ req }) => {
    calls.count += 1;

    return req.user?.email === hiddenFor.email ? { id: { not_in: hiddenIds } } : true;
  };
  config.access.read = hide;
  try {
    await work(calls);
  } finally {
    config.access.read = original;
  }
};

const createPost = async (payload: Payload, folder: number | null, slug: string, title: string) =>
  (await payload.create({
    collection: "posts",
    data: { folder, slug, title } as never,
    depth: 0,
    overrideAccess: true,
  })) as unknown as { id: number };

const createLivePage = async (
  payload: Payload,
  folder: number | null,
  slug: string,
  title: string
) =>
  (await payload.create({
    collection: "pages",
    data: { _status: "published", folder, slug, title } as never,
    depth: 0,
    overrideAccess: true,
  })) as unknown as { id: number };

const createDraftPage = async (
  payload: Payload,
  folder: number | null,
  slug: string,
  title: string
) =>
  (await payload.create({
    collection: "pages",
    data: { _status: "draft", folder, slug, title } as never,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })) as unknown as { id: number };

const hiddenTitle = "Hidden launch plan";
const hiddenNeutral = "is already used by a page";

describe("a refused publish right is told before any conflict is read", () => {
  it("a drafter moving a live page onto a taken path gets 403 and no foreign title", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    await createLivePage(payload, tree.blog.id, "contact", "Clash page");

    const asEditor = await call<ErrorBody>("POST", "/folders-tree/move", editor, {
      items: [{ collection: "pages", id: tree.pages.contact.id }],
      toFolder: tree.blog.id,
    });
    // The same move by an editor is a path conflict, so the probe is real.
    expect(asEditor.status).toBe(409);
    expect(JSON.stringify(asEditor.body)).toContain("Clash page");

    const { body, status } = await call<ErrorBody>("POST", "/folders-tree/move", drafter, {
      items: [{ collection: "pages", id: tree.pages.contact.id }],
      toFolder: tree.blog.id,
    });

    expect(status).toBe(403);
    expect(JSON.stringify(body)).not.toContain("Clash page");
    expect(JSON.stringify(body)).not.toContain("/blog/contact");
  });

  it("a drafter moving a folder with live pages onto a taken path gets 403 and no foreign title", async () => {
    const { payload } = harness;
    const tree = await seedTree(payload);
    await createLivePage(payload, tree.blog.id, "about", "Clash page");

    const asEditor = await call<ErrorBody>("POST", "/folders-tree/move", editor, {
      items: [{ collection: "folders", id: tree.about.id }],
      toFolder: tree.blog.id,
    });
    expect(asEditor.status).toBe(409);
    expect(JSON.stringify(asEditor.body)).toContain("Clash page");

    const { body, status } = await call<ErrorBody>("POST", "/folders-tree/move", drafter, {
      items: [{ collection: "folders", id: tree.about.id }],
      toFolder: tree.blog.id,
    });

    expect(status).toBe(403);
    expect(JSON.stringify(body)).not.toContain("Clash page");
    expect(JSON.stringify(body)).not.toContain("/blog/about");
  });
});

describe("a conflict names a page only to a reader who may read it", () => {
  it("check-segment says a page, not its title, when the editor cannot read the page", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { slug: "blog" });
    const secret = await createDraftPage(payload, blog.id, "secret", hiddenTitle);
    await createPost(payload, blog.id, "open", "Open post");

    await withRead("pages", editor, [secret.id], async () => {
      const hidden = await call<{ message: string }>(
        "GET",
        `/folders-tree/check-segment?parent=${blog.id}&segment=secret`,
        editor
      );
      const visible = await call<{ message: string }>(
        "GET",
        `/folders-tree/check-segment?parent=${blog.id}&segment=open`,
        editor
      );

      expect(JSON.stringify(hidden.body)).not.toContain(hiddenTitle);
      expect(hidden.body.message).toBe(`/blog/secret ${hiddenNeutral}`);
      expect(visible.body.message).toBe("/blog/open is already used by Open post");
    });
  });

  it("a move and its preview say a page when the editor cannot read the page in the way", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { slug: "blog" });
    const hidden = await createPost(payload, blog.id, "secret", hiddenTitle);
    const open = await createPost(payload, blog.id, "open", "Open post");
    const secretMover = await createLivePage(payload, null, "secret", "Moving secret");
    const openMover = await createLivePage(payload, null, "open", "Moving open");

    await withRead("posts", editor, [hidden.id], async (calls) => {
      const body = {
        items: [{ collection: "pages", id: secretMover.id }],
        toFolder: blog.id,
      };

      calls.count = 0;
      const move = await call<ErrorBody>("POST", "/folders-tree/move", editor, body);
      expect(move.status).toBe(409);
      expect(JSON.stringify(move.body)).not.toContain(hiddenTitle);
      expect(move.body.errors[0].message).toContain(`/blog/secret ${hiddenNeutral}`);
      expect(calls.count).toBeLessThanOrEqual(1);

      const preview = await call<MovePreview>("POST", "/folders-tree/move/preview", editor, body);
      expect(preview.status).toBe(200);
      expect(JSON.stringify(preview.body)).not.toContain(hiddenTitle);
      expect(preview.body.blocked[0].message).toContain(`/blog/secret ${hiddenNeutral}`);

      const control = await call<MovePreview>("POST", "/folders-tree/move/preview", editor, {
        items: [{ collection: "pages", id: openMover.id }],
        toFolder: blog.id,
      });
      expect(control.body.blocked[0].message).toContain("/blog/open is already used by Open post");
      expect(open.id).toBeDefined();
    });
  });

  it("a move says another page, not its title, when the root page in the way is unreadable", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const guide = await createFolder(payload, { slug: "guide" });
    const hiddenRoot = (await payload.create({
      collection: "posts",
      data: { folder: docs.id, isFolderRoot: true, slug: "start", title: hiddenTitle } as never,
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    const mover = (await payload.create({
      collection: "pages",
      data: {
        _status: "published",
        folder: guide.id,
        isFolderRoot: true,
        slug: "intro",
        title: "Intro",
      } as never,
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };

    await withRead("posts", editor, [hiddenRoot.id], async () => {
      const preview = await call<MovePreview>("POST", "/folders-tree/move/preview", editor, {
        items: [{ collection: "pages", id: mover.id }],
        toFolder: docs.id,
      });

      expect(preview.body.blocked[0]).toMatchObject({ reason: "rootPage" });
      expect(JSON.stringify(preview.body)).not.toContain(hiddenTitle);
      expect(preview.body.blocked[0].message).toContain("Another page is already the root page");
    });
  });

  it("a rename preview says a page when the editor cannot read the page in the way", async () => {
    const { payload } = harness;
    const old = await createFolder(payload, { slug: "old" });
    const hidden = await createPost(payload, null, "secret", hiddenTitle);
    await createPost(payload, null, "open", "Open post");

    await withRead("posts", editor, [hidden.id], async () => {
      const preview = await call<MovePreview>(
        "POST",
        `/folders-tree/folders/${old.id}/preview`,
        editor,
        { slug: "secret" }
      );
      const control = await call<MovePreview>(
        "POST",
        `/folders-tree/folders/${old.id}/preview`,
        editor,
        { slug: "open" }
      );

      expect(JSON.stringify(preview.body)).not.toContain(hiddenTitle);
      expect(preview.body.blocked[0].message).toBe(`/secret ${hiddenNeutral}`);
      expect(control.body.blocked[0].message).toBe("/open is already used by Open post");
    });
  });
});

const readUserDocument = async (email: string) =>
  ({
    ...(
      await harness.payload.find({
        collection: "users",
        depth: 0,
        overrideAccess: true,
        where: { email: { equals: email } },
      })
    ).docs[0],
    collection: "users",
  }) as never;

/** The messages of the validation error a save as `user` is refused with. */
const saveRefusal = async (work: Promise<unknown>): Promise<string[]> => {
  try {
    await work;
  } catch (error) {
    return ((error as { data?: { errors?: Array<{ message: string }> } }).data?.errors ?? []).map(
      ({ message }) => message
    );
  }
  throw new Error("expected the save to be refused");
};

describe("a refused save names a page only to a reader who may read it", () => {
  it("a taken slug says a page when the editor cannot read the live page that holds it", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { slug: "blog" });
    const hidden = await createLivePage(payload, blog.id, "secret", hiddenTitle);
    await createLivePage(payload, blog.id, "open", "Open page");
    const user = await readUserDocument(editor.email);

    await withRead("pages", editor, [hidden.id], async () => {
      const refusedHidden = await saveRefusal(
        payload.create({
          collection: "pages",
          data: { _status: "published", folder: blog.id, slug: "secret", title: "Late" } as never,
          depth: 0,
          overrideAccess: false,
          user,
        })
      );
      const refusedOpen = await saveRefusal(
        payload.create({
          collection: "pages",
          data: {
            _status: "published",
            folder: blog.id,
            slug: "open",
            title: "Late open",
          } as never,
          depth: 0,
          overrideAccess: false,
          user,
        })
      );

      expect(JSON.stringify(refusedHidden)).not.toContain(hiddenTitle);
      expect(refusedHidden).toEqual(["/blog/secret is already used by a page (published)"]);
      expect(refusedOpen).toEqual(["/blog/open is already used by Open page (published)"]);
    });
  });

  it("a taken slug says a page when the editor cannot read the collection of the page that holds it", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { slug: "blog" });
    await createPost(payload, blog.id, "secret", hiddenTitle);
    const user = await readUserDocument(editor.email);

    const config = payload.collections.posts.config;
    const original = config.access.read;
    config.access.read = ({ req }) => req.user?.email !== editor.email;
    try {
      const refused = await saveRefusal(
        payload.create({
          collection: "pages",
          data: { _status: "published", folder: blog.id, slug: "secret", title: "Late" } as never,
          depth: 0,
          overrideAccess: false,
          user,
        })
      );

      expect(JSON.stringify(refused)).not.toContain(hiddenTitle);
      expect(refused).toEqual(["/blog/secret is already used by a page (published)"]);
    } finally {
      config.access.read = original;
    }
  });

  it("a publish that takes a slug names a page only when the editor may read the holder", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { slug: "blog" });
    const hidden = await createLivePage(payload, blog.id, "secret", hiddenTitle);
    const open = await createLivePage(payload, blog.id, "open", "Open page");
    const hiddenDraft = await createDraftPage(payload, blog.id, "secret", "Draft one");
    const openDraft = await createDraftPage(payload, blog.id, "open", "Draft two");
    const user = await readUserDocument(editor.email);

    await withRead("pages", editor, [hidden.id], async () => {
      const publish = (id: number) =>
        saveRefusal(
          payload.update({
            collection: "pages",
            data: { _status: "published" } as never,
            depth: 0,
            id,
            overrideAccess: false,
            user,
          })
        );

      expect(await publish(hiddenDraft.id)).toEqual([
        "/blog/secret is already used by a page (published)",
      ]);
      expect(await publish(openDraft.id)).toEqual([
        "/blog/open is already used by Open page (published)",
      ]);
      expect(open.id).toBeDefined();
    });
  });

  it("a taken root place says another page when the editor cannot read the root page", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const guide = await createFolder(payload, { slug: "guide" });
    const hiddenRoot = (await payload.create({
      collection: "pages",
      data: {
        _status: "published",
        folder: docs.id,
        isFolderRoot: true,
        slug: "start",
        title: hiddenTitle,
      } as never,
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    await createPost(payload, guide.id, "intro", "Open root");
    await payload.update({
      collection: "posts",
      data: { isFolderRoot: true } as never,
      depth: 0,
      id: (
        await payload.find({
          collection: "posts",
          depth: 0,
          overrideAccess: true,
          where: { slug: { equals: "intro" } },
        })
      ).docs[0].id,
      overrideAccess: true,
    });
    const user = await readUserDocument(editor.email);
    const saveRoot = (folder: number, slug: string) =>
      saveRefusal(
        payload.create({
          collection: "pages",
          data: {
            _status: "published",
            folder,
            isFolderRoot: true,
            slug,
            title: "Late root",
          } as never,
          depth: 0,
          overrideAccess: false,
          user,
        })
      );

    await withRead("pages", editor, [hiddenRoot.id], async () => {
      const refusedHidden = await saveRoot(docs.id, "begin");
      const refusedOpen = await saveRoot(guide.id, "begin");

      expect(JSON.stringify(refusedHidden)).not.toContain(hiddenTitle);
      expect(refusedHidden).toEqual([
        "Another page is already the root page of /docs. Unset it first.",
      ]);
      expect(refusedOpen).toEqual([
        "Open root is already the root page of /guide. Unset it first.",
      ]);
    });
  });
});

describe("a refused publish of every locale names a page only to a reader who may read it", () => {
  // A de draft slug is judged when the page is written, after the default-locale checks passed.
  it("a de slug that another page took says a page when the editor cannot read it", async () => {
    const { payload } = harness;
    const blog = await createFolder(payload, { slug: "blog" });
    const owner = await createLivePage(payload, blog.id, "owner", "Owner");
    await payload.update({
      collection: "pages",
      data: { _status: "published", slug: "wire", title: hiddenTitle } as never,
      depth: 0,
      id: owner.id,
      locale: "de",
      overrideAccess: true,
    });
    const other = await createLivePage(payload, blog.id, "other", "Other");
    await payload.update({
      collection: "pages",
      data: { slug: "wire", title: "Anderer Draht" } as never,
      depth: 0,
      draft: true,
      id: other.id,
      locale: "de",
      overrideAccess: true,
    });
    const user = await readUserDocument(editor.email);
    const publishAsEditor = () =>
      saveRefusal(
        payload.update({
          collection: "pages",
          data: { _status: "published" } as never,
          depth: 0,
          id: other.id,
          overrideAccess: false,
          publishAllLocales: true,
          user,
        })
      );

    await withRead("pages", editor, [owner.id], async () => {
      const refused = await publishAsEditor();

      expect(JSON.stringify(refused)).not.toContain(hiddenTitle);
      expect(refused).toEqual(["/blog/wire is already used by a page (published)"]);
    });
    await withRead("pages", editor, [], async () => {
      expect(await publishAsEditor()).toEqual([
        `/blog/wire is already used by ${hiddenTitle} (published)`,
      ]);
    });
  });

  it("a root flag that another page took says another page when the editor cannot read it", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const taker = await createLivePage(payload, docs.id, "taker", hiddenTitle);
    await payload.update({
      collection: "pages",
      data: { isFolderRoot: true } as never,
      depth: 0,
      id: taker.id,
      overrideAccess: true,
    });
    const former = await createLivePage(payload, docs.id, "former", "Former");
    await payload.update({
      collection: "pages",
      data: { isFolderRoot: true } as never,
      depth: 0,
      draft: true,
      id: former.id,
      overrideAccess: true,
    });
    const user = await readUserDocument(editor.email);
    const publishAsEditor = () =>
      saveRefusal(
        payload.update({
          collection: "pages",
          data: { _status: "published" } as never,
          depth: 0,
          id: former.id,
          overrideAccess: false,
          publishAllLocales: true,
          user,
        })
      );

    await withRead("pages", editor, [taker.id], async () => {
      const refused = await publishAsEditor();

      expect(JSON.stringify(refused)).not.toContain(hiddenTitle);
      expect(refused).toEqual(["Another page is already the root page of /docs. Unset it first."]);
    });
    await withRead("pages", editor, [], async () => {
      expect(await publishAsEditor()).toEqual([
        `${hiddenTitle} is already the root page of /docs. Unset it first.`,
      ]);
    });
  });
});

describe("samples and refusals list only what the reader may read", () => {
  it("a folder move preview and a rename preview sample no page the editor cannot read", async () => {
    const { payload } = harness;
    const docs = await createFolder(payload, { slug: "docs" });
    const target = await createFolder(payload, { slug: "target" });
    const hidden = await createPost(payload, docs.id, "secret", hiddenTitle);
    const open = await createPost(payload, docs.id, "open", "Open post");

    await withRead("posts", editor, [hidden.id], async () => {
      const move = await call<MovePreview>("POST", "/folders-tree/move/preview", editor, {
        items: [{ collection: "folders", id: docs.id }],
        toFolder: target.id,
      });
      const rename = await call<MovePreview>(
        "POST",
        `/folders-tree/folders/${docs.id}/preview`,
        editor,
        { slug: "papers" }
      );

      for (const preview of [move.body, rename.body]) {
        expect(preview.ok).toBe(true);
        expect([...new Set(preview.samples.map((sample) => sample.id))]).toEqual([open.id]);
        expect(preview.urlChanges.published).toBe(2);
        expect(JSON.stringify(preview)).not.toContain("secret");
      }
    });
  });

  it("a refused delete counts every refused document and lists only the readable ones", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const hidden = await createLivePage(payload, news.id, "secret", hiddenTitle);
    const open = await createLivePage(payload, news.id, "open", "Open page");

    await withRead("pages", drafter, [hidden.id], async () => {
      const { body, status } = await call<ErrorBody>("POST", "/folders-tree/delete", drafter, {
        items: [{ collection: "folders", id: news.id }],
      });

      expect(status).toBe(403);
      // Two pages and the folder.
      expect(body.errors[0].data?.count).toBe(3);
      expect(body.errors[0].data?.items).toEqual(
        expect.arrayContaining([
          { collection: "pages", id: open.id },
          { collection: "folders", id: news.id },
        ])
      );
      expect(body.errors[0].data?.items).toHaveLength(2);
      expect(JSON.stringify(body)).not.toContain(`"id":${hidden.id},`);
    });
  });

  it("a refused publish counts every refused page and lists only the readable ones", async () => {
    const { payload } = harness;
    const news = await createFolder(payload, { slug: "news" });
    const hidden = await createDraftPage(payload, news.id, "secret", hiddenTitle);
    const open = await createDraftPage(payload, news.id, "open", "Open page");

    await withRead("pages", drafter, [hidden.id], async () => {
      const { body, status } = await call<ErrorBody>("POST", "/folders-tree/publish", drafter, {
        action: "publish",
        items: [{ collection: "folders", id: news.id }],
      });

      expect(status).toBe(403);
      expect(body.errors[0].data?.count).toBe(2);
      expect(body.errors[0].data?.items).toEqual([{ collection: "pages", id: open.id }]);
    });
  });
});
