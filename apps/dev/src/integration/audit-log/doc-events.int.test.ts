import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  ACCESS_ROLES_SLUG,
  AUDIT_SLUG,
  bootAuditPayload,
  createTextUpload,
  createUser,
  events,
  eventsWithAction,
  loginHeaders,
  PASSWORD,
  POST_HOOK_FLAGS,
  rest,
  timestampAfterEverythingSoFar,
  targetEvents,
} from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

let ctx: AuditTestPayload;
beforeAll(async () => {
  ctx = await bootAuditPayload();
});
afterAll(async () => {
  await ctx?.cleanup();
});

let testStartedAt = "";
beforeEach(async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
});

const eventsOfThisTest = (slug: string, id: unknown) =>
  targetEvents(ctx.payload, slug, id, testStartedAt);

const actionsOf = (log: { action?: unknown }[]) => log.map((event) => event.action);

const createPost = (data: Record<string, unknown>, options: Record<string, unknown> = {}) =>
  ctx.payload.create({ collection: "posts" as never, data: data as never, ...options });

const updateDoc = (
  collection: string,
  id: unknown,
  data: Record<string, unknown>,
  options: Record<string, unknown> = {}
) =>
  ctx.payload.update({
    collection: collection as never,
    id: id as string,
    data: data as never,
    ...options,
  });

const autosavePage = (id: unknown, data: Record<string, unknown>) =>
  updateDoc("pages", id, data, { draft: true, autosave: true });

describe("document events", () => {
  it("create, update and delete record only the changed paths and never their values; a no-op save records nothing; an unlocalized collection has no target locale", async () => {
    const doc = await createPost({ title: "A" });
    await updateDoc("posts", doc.id, { title: "B", seo: { description: "seo-value" } });
    await updateDoc("posts", doc.id, { title: "B" });
    await ctx.payload.delete({ collection: "posts" as never, id: doc.id });

    const log = await eventsOfThisTest("posts", doc.id);
    expect(actionsOf(log)).toEqual(["doc.create", "doc.update", "doc.delete"]);
    expect(log[0]?.changes).toEqual(["title", "_status"]);
    expect(log[1]?.changes).toEqual(["title", "seo.description"]);
    expect(JSON.stringify(log)).not.toContain('"seo-value"');
    expect(log[0]?.target.locale ?? null).toBeNull();
  });

  it("publish and unpublish, but a draft save is an update", async () => {
    const doc = await createPost({ title: "P", _status: "draft" }, { draft: true });
    await updateDoc("posts", doc.id, { _status: "published" });
    await updateDoc("posts", doc.id, { title: "P2" }, { draft: true });
    await updateDoc("posts", doc.id, { _status: "draft" });

    expect(actionsOf(await eventsOfThisTest("posts", doc.id))).toEqual([
      "doc.create",
      "doc.publish",
      "doc.update",
      "doc.unpublish",
    ]);
  });

  it("restore", async () => {
    const doc = await createPost({ title: "V1" });
    await updateDoc("posts", doc.id, { title: "V2" });
    const versions = await ctx.payload.findVersions({
      collection: "posts" as never,
      where: { parent: { equals: doc.id } },
      sort: "createdAt",
    });
    await ctx.payload.restoreVersion({
      collection: "posts" as never,
      id: String(versions.docs[0]?.id),
    });

    const log = await eventsOfThisTest("posts", doc.id);
    expect(actionsOf(log)).toEqual(["doc.create", "doc.update", "doc.restore"]);
    expect(log.at(-1)?.changes).toContain("title");
  });

  it("relationship fields are not reported when unchanged", async () => {
    const author = await createUser(ctx.payload, "author@example.com");
    const doc = await createPost({ title: "R", author: author.id });
    await ctx.payload.create({
      collection: "comments" as never,
      data: { text: "c", post: doc.id } as never,
    });
    await updateDoc("posts", doc.id, { title: "R2" });

    const log = await eventsOfThisTest("posts", doc.id);
    expect(actionsOf(log)).toEqual(["doc.create", "doc.update"]);
    expect(log[1]?.changes).toEqual(["title"]);
  });

  it("login is recorded", async () => {
    await createUser(ctx.payload, "l@example.com");
    await ctx.payload.login({
      collection: "users" as never,
      data: { email: "l@example.com", password: PASSWORD },
    });
    const [login] = await eventsWithAction(ctx.payload, "auth.login");
    expect(login?.actor).toMatchObject({ type: "user", label: "l@example.com" });
  });
});

describe("duplicate", () => {
  it("is doc.create of the copy, without metadata", async () => {
    const doc = await createPost({ title: "Src" });
    const copy = await ctx.payload.duplicate({ collection: "posts" as never, id: doc.id });

    const [event] = await eventsOfThisTest("posts", copy.id);
    expect(event?.action).toBe("doc.create");
    expect(event?.metadata ?? null).toBeNull();
  });

  it("a nested create in a project afterChange stays doc.create", async () => {
    const doc = await createPost({ title: "Src2" });
    const copy = await ctx.payload.duplicate({
      collection: "posts" as never,
      id: doc.id,
      context: { [POST_HOOK_FLAGS.createNestedPostTitled]: "Nested" },
    });

    const [outer] = await eventsOfThisTest("posts", copy.id);
    expect(outer?.action).toBe("doc.create");
    const nested = await events(ctx.payload, { "target.label": { equals: "Nested" } });
    expect(actionsOf(nested)).toEqual(["doc.create"]);
    expect(nested[0]?.metadata ?? null).toBeNull();
  });

  it("an upload doc is doc.create of the copy", async () => {
    const media = await createTextUpload(ctx.payload);
    const copy = await ctx.payload.duplicate({ collection: "media" as never, id: media.id });

    expect(actionsOf(await eventsOfThisTest("media", media.id))[0]).toBe("doc.create");
    const [duplicated] = await eventsOfThisTest("media", copy.id);
    expect(duplicated?.action).toBe("doc.create");
    expect(duplicated?.metadata ?? null).toBeNull();
  });
});

describe("publishing after autosave ticks", () => {
  it("lists what changed since the previous publish, without relationships, joins or virtual fields", async () => {
    const post = await createPost({ title: "Rel" });
    const page = await ctx.payload.create({
      collection: "pages" as never,
      data: { title: "T", body: "b", related: post.id, _status: "published" } as never,
    });
    await autosavePage(page.id, { body: "b2" });
    await autosavePage(page.id, { body: "b3" });
    await updateDoc("pages", page.id, { _status: "published" });

    const log = await eventsOfThisTest("pages", page.id);
    expect(actionsOf(log)).toEqual(["doc.create", "doc.publish"]);
    const changes = log[1]?.changes as string[];
    expect(changes).toContain("body");
    expect(changes).not.toContain("related");
    expect(changes).not.toContain("notes");
    expect(changes).not.toContain("titleUpper");
  });

  it("the first publish lists the doc's fields", async () => {
    const page = await ctx.payload.create({
      collection: "pages" as never,
      data: { title: "D", body: "x" } as never,
      draft: true,
    });
    await autosavePage(page.id, { body: "y" });
    await updateDoc("pages", page.id, { _status: "published" });

    const log = await eventsOfThisTest("pages", page.id);
    expect(actionsOf(log)).toEqual(["doc.create", "doc.publish"]);
    expect(log[1]?.changes).toEqual(expect.arrayContaining(["title", "body", "_status"]));
  });
});

describe("bulk publishing", () => {
  const createDraftPages = (title: string) =>
    Promise.all(
      [1, 2].map(() =>
        ctx.payload.create({
          collection: "pages" as never,
          data: { title, body: "a" } as never,
          draft: true,
        })
      )
    );

  const updatePagesTitled = (
    title: string,
    data: Record<string, unknown>,
    options: Record<string, unknown> = {}
  ) =>
    ctx.payload.update({
      collection: "pages" as never,
      where: { title: { equals: title } },
      data: data as never,
      ...options,
    });

  const logOf = async (ids: string[], occurredSince = testStartedAt) => {
    const log = await events(ctx.payload, {
      and: [
        { "target.slug": { equals: "pages" } },
        { "target.docId": { in: ids } },
        { occurredAt: { greater_than_equal: occurredSince } },
        { action: { not_equals: "doc.create" } },
      ],
    });
    const byActionThenGivenIdOrder = (a: AuditEventRow, b: AuditEventRow) =>
      String(a.action).localeCompare(String(b.action)) ||
      ids.indexOf(a.target.docId) - ids.indexOf(b.target.docId);
    return log
      .sort(byActionThenGivenIdOrder)
      .map((event) => [event.target.docId, event.action, event.changes]);
  };

  it("a bulk publish is compared with the stored documents it publishes, and a bulk unpublish is doc.unpublish", async () => {
    const title = `bulk-publish-${Date.now()}`;
    const pages = await createDraftPages(title);
    const ids = pages.map((page) => String(page.id));
    const [first, second] = ids;
    await autosavePage(first, { body: "autosaved, not published by a bulk publish" });
    await updatePagesTitled(title, { _status: "published", body: "bulk" });
    await updatePagesTitled(title, { _status: "draft" });

    expect(await logOf(ids)).toEqual([
      [first, "doc.publish", ["body", "_status"]],
      [second, "doc.publish", ["body", "_status"]],
      [first, "doc.unpublish", ["_status"]],
      [second, "doc.unpublish", ["_status"]],
    ]);
  });

  it("a bulk publish of drafts, as the admin sends it, is compared with the latest draft of each document", async () => {
    const title = `bulk-drafts-${Date.now()}`;
    const pages = await createDraftPages(title);
    const ids = pages.map((page) => String(page.id));
    const [first, second] = ids;
    await updatePagesTitled(title, { _status: "published", body: "published" });
    await updatePagesTitled(title, { _status: "draft" });
    const unpublishedAt = await timestampAfterEverythingSoFar();
    await autosavePage(first, { body: "autosaved" });
    await updatePagesTitled(title, { _status: "published" }, { draft: true });

    expect(await logOf(ids, unpublishedAt)).toEqual([
      [first, "doc.publish", ["_status"]],
      [second, "doc.publish", ["_status"]],
    ]);
  });
});

describe("trash", () => {
  it("moving to the trash and restoring are doc.update with deletedAt, deleting for good is doc.delete", async () => {
    const post = await createPost({ title: "Trashed" });
    await updateDoc("posts", post.id, { deletedAt: new Date().toISOString() });
    await ctx.payload.update({
      collection: "posts" as never,
      id: post.id,
      data: { deletedAt: null } as never,
      trash: true,
    });
    await ctx.payload.delete({ collection: "posts" as never, id: post.id });

    const log = await eventsOfThisTest("posts", post.id);
    expect(log.map((event) => [event.action, event.changes ?? null])).toEqual([
      ["doc.create", ["title", "_status"]],
      ["doc.update", ["deletedAt"]],
      ["doc.update", ["deletedAt"]],
      ["doc.delete", null],
    ]);
  });
});

describe("roles", () => {
  it("a role change is a doc.update of the user with only the role path", async () => {
    const user = await createUser(ctx.payload, "r@example.com");
    await updateDoc("users", user.id, { role: "admin" });

    const log = await eventsOfThisTest("users", user.id);
    expect(log.map((event) => [event.action, event.changes])).toEqual([
      ["doc.create", expect.any(Array)],
      ["doc.update", ["role"]],
    ]);
  });

  it("a relationship role populated by a REST read at depth 2 is not a change; pointing it elsewhere is", async () => {
    const createRole = (name: string) =>
      ctx.payload.create({ collection: ACCESS_ROLES_SLUG as never, data: { name } as never });
    const [editors, admins] = await Promise.all([createRole("Editors"), createRole("Admins")]);
    const user = await createUser(ctx.payload, "relation-role@example.com", {
      roles: [editors.id],
    });
    const headers = await loginHeaders(ctx.payload, "relation-role@example.com");
    const patchAtDepth2 = (body: Record<string, unknown>) =>
      rest(ctx.payload, "PATCH", `/users/${user.id}?depth=2`, { headers, body });
    const changesOfUser = async () =>
      (await eventsOfThisTest("users", user.id))
        .filter((event) => event.action === "doc.update")
        .map((event) => [event.action, event.changes]);

    const renamed = await patchAtDepth2({ name: "Renamed" });
    expect(renamed.status).toBe(200);
    const { doc } = (await renamed.json()) as { doc: { roles: { name?: string }[] } };
    expect(doc.roles[0]?.name).toBe("Editors");
    expect(await changesOfUser()).toEqual([["doc.update", ["name"]]]);

    const regranted = await patchAtDepth2({ roles: [admins.id] });
    expect(regranted.status).toBe(200);
    expect(await changesOfUser()).toEqual([
      ["doc.update", ["name"]],
      ["doc.update", ["roles.0"]],
    ]);
  });
});

describe("request ids", () => {
  it("every document of one bulk update shares the request's id, and another request gets another id", async () => {
    const title = `bulk-${Date.now()}`;
    const posts = await Promise.all([1, 2, 3].map(() => createPost({ title })));
    await ctx.payload.update({
      collection: "posts" as never,
      where: { title: { equals: title } },
      data: { title: `${title}-renamed` } as never,
    });

    const updates = await events(ctx.payload, {
      and: [
        { action: { equals: "doc.update" } },
        { "target.docId": { in: posts.map((post) => String(post.id)) } },
        { occurredAt: { greater_than_equal: testStartedAt } },
      ],
    });
    expect(updates).toHaveLength(3);
    expect(new Set(updates.map((event) => event.requestId)).size).toBe(1);

    const creates = await events(ctx.payload, {
      and: [
        { action: { equals: "doc.create" } },
        { "target.docId": { in: posts.map((post) => String(post.id)) } },
      ],
    });
    expect(creates.map((event) => event.requestId)).not.toContain(updates[0]?.requestId);
  });
});

describe("auth secrets and unreadable fields", () => {
  const signInNewAdmin = async () => {
    const email = `admin-${Date.now()}@example.com`;
    await createUser(ctx.payload, email, { role: "admin" });
    return loginHeaders(ctx.payload, email);
  };
  const createUserWithHiddenNotes = (email: string) =>
    createUser(ctx.payload, email, { internalNote: "in", privateNote: "pn" });
  const everyRowOfThisTestAsStored = async () => {
    const { docs } = await ctx.payload.find({
      collection: AUDIT_SLUG as never,
      where: { occurredAt: { greater_than_equal: testStartedAt } } as never,
      limit: 0,
      depth: 0,
    });
    return JSON.stringify(docs);
  };

  it("an admin changing another user's password is logged by name, never by value, and the change goes through", async () => {
    const headers = await signInNewAdmin();
    const user = await createUserWithHiddenNotes("pw@example.com");
    const res = await rest(ctx.payload, "PATCH", `/users/${user.id}`, {
      headers,
      body: { password: "brand-new-secret-77" },
    });
    expect(res.status).toBe(200);

    const log = await eventsOfThisTest("users", user.id);
    expect(actionsOf(log)).toEqual(["doc.create", "doc.update"]);
    expect(log[1]?.changes).toEqual(["password"]);
    expect(await everyRowOfThisTestAsStored()).not.toContain("brand-new-secret-77");

    const loginWithNewPassword = await rest(ctx.payload, "POST", "/users/login", {
      body: { email: "pw@example.com", password: "brand-new-secret-77" },
    });
    expect(loginWithNewPassword.status).toBe(200);
  });

  it("hidden and read-restricted fields are not reported on a REST save", async () => {
    const headers = await signInNewAdmin();
    const user = await createUserWithHiddenNotes("hidden@example.com");
    const res = await rest(ctx.payload, "PATCH", `/users/${user.id}`, {
      headers,
      body: { name: "Renamed" },
    });
    expect(res.status).toBe(200);

    const log = await eventsOfThisTest("users", user.id);
    expect(actionsOf(log)).toEqual(["doc.create", "doc.update"]);
    expect(log[1]?.changes).toEqual(["name"]);
  });

  const createComment = (data: Record<string, unknown>) =>
    ctx.payload.create({ collection: "comments" as never, data: data as never });

  const readCommentAs = async (headers: Record<string, string>, id: unknown) => {
    const res = await rest(ctx.payload, "GET", `/comments/${id}`, { headers });
    return (await res.json()) as Record<string, any>;
  };

  const patchComment = (
    headers: Record<string, string>,
    id: unknown,
    body: Record<string, unknown>
  ) => rest(ctx.payload, "PATCH", `/comments/${id}`, { headers, body });

  it("a no-op REST save does not report hidden or read-restricted fields of a group, and a visible change in it is reported", async () => {
    const headers = await signInNewAdmin();
    const comment = await createComment({
      profile: { headline: "h", taxId: "tax-1", pin: "1234" },
    });
    const { profile } = await readCommentAs(headers, comment.id);
    expect(profile).toEqual({ headline: "h" });

    expect((await patchComment(headers, comment.id, { profile })).status).toBe(200);
    expect(actionsOf(await eventsOfThisTest("comments", comment.id))).toEqual(["doc.create"]);

    expect((await patchComment(headers, comment.id, { profile: { headline: "h2" } })).status).toBe(
      200
    );
    const log = await eventsOfThisTest("comments", comment.id);
    expect(actionsOf(log)).toEqual(["doc.create", "doc.update"]);
    expect(log[1]?.changes).toEqual(["profile.headline"]);
  });

  it("a no-op REST save does not report read-restricted fields of array rows, and a visible change in a row is reported", async () => {
    const headers = await signInNewAdmin();
    const comment = await createComment({
      contacts: [
        { label: "home", phone: "111" },
        { label: "work", phone: "222" },
      ],
    });
    const { contacts } = await readCommentAs(headers, comment.id);
    expect(contacts.map((row: Record<string, unknown>) => row.phone)).toEqual([
      undefined,
      undefined,
    ]);

    expect((await patchComment(headers, comment.id, { contacts })).status).toBe(200);
    expect(actionsOf(await eventsOfThisTest("comments", comment.id))).toEqual(["doc.create"]);

    const renamed = [contacts[0], { ...contacts[1], label: "office" }];
    expect((await patchComment(headers, comment.id, { contacts: renamed })).status).toBe(200);
    const log = await eventsOfThisTest("comments", comment.id);
    expect(actionsOf(log)).toEqual(["doc.create", "doc.update"]);
    expect(log[1]?.changes).toEqual(["contacts.1.label"]);
  });

  it("a no-op REST save does not report hidden fields of blocks, and a visible change in a block is reported", async () => {
    const headers = await signInNewAdmin();
    const comment = await createComment({
      layout: [{ blockType: "secretNote", heading: "h", secret: "s" }],
    });
    const { layout } = await readCommentAs(headers, comment.id);
    expect(layout[0]?.secret).toBeUndefined();

    expect((await patchComment(headers, comment.id, { layout })).status).toBe(200);
    expect(actionsOf(await eventsOfThisTest("comments", comment.id))).toEqual(["doc.create"]);

    const edited = [{ ...layout[0], heading: "h2" }];
    expect((await patchComment(headers, comment.id, { layout: edited })).status).toBe(200);
    const log = await eventsOfThisTest("comments", comment.id);
    expect(actionsOf(log)).toEqual(["doc.create", "doc.update"]);
    expect(log[1]?.changes).toEqual(["layout.0.heading"]);
  });

  it("switching an API key on and off is doc.update by name, never by value", async () => {
    const integration = await ctx.payload.create({
      collection: "integrations" as never,
      data: { name: "bot" } as never,
    });
    await updateDoc("integrations", integration.id, {
      enableAPIKey: true,
      apiKey: "key-0123456789abcdef",
    });
    await updateDoc("integrations", integration.id, { enableAPIKey: false, apiKey: null });

    const log = await eventsOfThisTest("integrations", integration.id);
    expect(actionsOf(log)).toEqual(["doc.create", "doc.update", "doc.update"]);
    expect(log[1]?.changes).toContain("apiKey");
    expect(log[2]?.changes).toContain("apiKey");
    expect(await everyRowOfThisTestAsStored()).not.toContain("key-0123456789abcdef");
  });
});
