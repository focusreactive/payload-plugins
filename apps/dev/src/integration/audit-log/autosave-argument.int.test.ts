import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  createUser,
  events,
  loginHeaders,
  PASSWORD,
  rest,
  targetEvents,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

let ctx: AuditTestPayload;
let signedInAdmin: Record<string, string>;
beforeAll(async () => {
  ctx = await bootAuditPayload();
  await createUser(ctx.payload, "autosave-admin@x.io", { role: "admin" });
  signedInAdmin = await loginHeaders(ctx.payload, "autosave-admin@x.io");
});
afterAll(async () => {
  await ctx?.cleanup();
});

let testStartedAt = "";
beforeEach(async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
});

const actionsAndChanges = (log: AuditEventRow[]) =>
  log.map((event) => [event.action, event.changes]);

const eventsOfThisTest = (slug: string, id: unknown) =>
  targetEvents(ctx.payload, slug, id, testStartedAt);

const globalEventsOfThisTest = (slug: string) =>
  events(ctx.payload, {
    and: [
      { "target.kind": { equals: "global" } },
      { "target.slug": { equals: slug } },
      { occurredAt: { greater_than_equal: testStartedAt } },
    ],
  });

const send = async (method: "POST" | "PATCH", path: string, body: Record<string, unknown>) => {
  const res = await rest(ctx.payload, method, path, { body, headers: signedInAdmin });
  expect(res.status).toBeLessThan(300);
  return (await res.json()) as { doc?: { id: unknown } };
};

const createDraft = (collection: string, title: string) =>
  ctx.payload.create({
    collection: collection as never,
    data: { title } as never,
    draft: true,
  });

const createPublished = (collection: string, title: string) =>
  ctx.payload.create({
    collection: collection as never,
    data: { title, _status: "published" } as never,
  });

describe("the autosave argument only skips saves where Payload keeps the stored document", () => {
  it("a REST role change with autosave in a collection without drafts is logged with its role change", async () => {
    const user = await createUser(ctx.payload, "autosave-victim@x.io", { role: "editor" });
    await send("PATCH", `/users/${user.id}?autosave=true`, { role: "admin" });

    const stored = await ctx.payload.findByID({ collection: "users" as never, id: user.id });
    expect((stored as { role?: unknown }).role).toBe("admin");
    expect(actionsAndChanges(await eventsOfThisTest("users", user.id))).toEqual([
      ["doc.create", expect.any(Array)],
      ["doc.update", ["role"]],
      ["user.role_changed", ["role"]],
    ]);
  });

  it("a REST create with autosave is logged", async () => {
    const { doc } = await send("POST", "/users?autosave=true", {
      email: "autosave-created@x.io",
      password: PASSWORD,
      role: "admin",
    });

    expect((await eventsOfThisTest("users", doc?.id)).map((event) => event.action)).toEqual([
      "doc.create",
    ]);
  });

  it.each(["pages", "posts"])(
    "a REST publish in %s sent with autosave and draft is logged as doc.publish",
    async (collection) => {
      const draft = await createDraft(collection, "draft");
      await send("PATCH", `/${collection}/${draft.id}?autosave=true&draft=true`, {
        title: "published over autosave",
        _status: "published",
      });

      const stored = await ctx.payload.findByID({ collection: collection as never, id: draft.id });
      expect(stored).toMatchObject({ title: "published over autosave", _status: "published" });
      expect((await eventsOfThisTest(collection, draft.id)).map((event) => event.action)).toEqual([
        "doc.create",
        "doc.publish",
      ]);
    }
  );

  it("a REST update of a global without drafts sent with autosave is logged", async () => {
    await send("POST", "/globals/settings?autosave=true", { siteName: "saved with autosave" });

    expect(actionsAndChanges(await globalEventsOfThisTest("settings"))).toEqual([
      ["global.update", ["siteName"]],
    ]);
  });

  it("a REST draft save sent with autosave to posts, whose drafts have no autosave, is logged with its change before the publish that makes it live", async () => {
    const post = await createPublished("posts", "good");
    await send("PATCH", `/posts/${post.id}?draft=true&autosave=true`, { title: "evil" });
    await send("PATCH", `/posts/${post.id}`, { _status: "published" });

    const live = await ctx.payload.db.findOne<{ id: number; title?: unknown }>({
      collection: "posts",
      where: { id: { equals: post.id } },
    });
    expect(live?.title).toBe("evil");
    expect(actionsAndChanges(await eventsOfThisTest("posts", post.id))).toEqual([
      ["doc.create", expect.any(Array)],
      ["doc.update", ["title", "_status"]],
      ["doc.publish", ["_status"]],
    ]);
  });

  it("a REST draft save sent with autosave to a global whose drafts have no autosave is logged with its change before the publish that makes it live", async () => {
    await ctx.payload.updateGlobal({
      slug: "banner" as never,
      data: { text: "good", _status: "published" } as never,
    });
    testStartedAt = await timestampAfterEverythingSoFar();

    await send("POST", "/globals/banner?draft=true&autosave=true", { text: "evil" });
    await send("POST", "/globals/banner", { _status: "published" });

    const live = await ctx.payload.db.findGlobal<{ text?: unknown }>({ slug: "banner" });
    expect(live?.text).toBe("evil");
    expect(actionsAndChanges(await globalEventsOfThisTest("banner"))).toEqual([
      ["global.update", ["text", "_status"]],
      ["global.publish", ["_status"]],
    ]);
  });

  it("genuine autosave draft ticks of documents and globals are still not logged", async () => {
    const page = await createPublished("pages", "published");
    const ticksStartedAt = await timestampAfterEverythingSoFar();
    await send("PATCH", `/pages/${page.id}?draft=true&autosave=true`, { title: "tick" });
    await send("PATCH", `/pages/${page.id}?draft=true&autosave=true`, {
      title: "tick 2",
      _status: "draft",
    });
    await send("POST", "/globals/header?draft=true&autosave=true", { title: "tick" });

    expect(await targetEvents(ctx.payload, "pages", page.id, ticksStartedAt)).toEqual([]);
    expect(await globalEventsOfThisTest("header")).toEqual([]);
  });
});
