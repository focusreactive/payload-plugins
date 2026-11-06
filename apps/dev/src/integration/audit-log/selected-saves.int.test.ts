import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  createUser,
  events,
  loginHeaders,
  rest,
  targetEvents,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

let ctx: AuditTestPayload;
let signedInAdmin: Record<string, string>;
beforeAll(async () => {
  ctx = await bootAuditPayload();
  await createUser(ctx.payload, "select-admin@x.io", { role: "admin" });
  signedInAdmin = await loginHeaders(ctx.payload, "select-admin@x.io");
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

const createPost = (data: Record<string, unknown>) =>
  ctx.payload.create({ collection: "posts" as never, data: data as never });

describe("saves that select which fields they return", () => {
  it("a document update records only the field that changed, not the fields left out of the selection", async () => {
    const post = await createPost({ title: "t", seo: { description: "d" } });
    testStartedAt = await timestampAfterEverythingSoFar();

    await ctx.payload.update({
      collection: "posts" as never,
      id: post.id,
      data: { title: "u" } as never,
      select: { title: true } as never,
    });

    expect(actionsAndChanges(await eventsOfThisTest("posts", post.id))).toEqual([
      ["doc.update", ["title"]],
    ]);
  });

  it("a document update selecting part of a group records only the field that changed", async () => {
    const post = await createPost({ title: "t", seo: { description: "d" } });
    testStartedAt = await timestampAfterEverythingSoFar();

    await ctx.payload.update({
      collection: "posts" as never,
      id: post.id,
      data: { seo: { description: "e" } } as never,
      select: { seo: { description: true } } as never,
    });

    expect(actionsAndChanges(await eventsOfThisTest("posts", post.id))).toEqual([
      ["doc.update", ["seo.description"]],
    ]);
  });

  it("a REST update with a select query records only the field that changed", async () => {
    const post = await createPost({ title: "t", seo: { description: "d" } });
    testStartedAt = await timestampAfterEverythingSoFar();

    const res = await rest(ctx.payload, "PATCH", `/posts/${post.id}?select[title]=true`, {
      body: { title: "rest" },
      headers: signedInAdmin,
    });
    expect(res.status).toBe(200);
    expect(Object.keys(((await res.json()) as { doc: object }).doc)).not.toContain("seo");

    expect(actionsAndChanges(await eventsOfThisTest("posts", post.id))).toEqual([
      ["doc.update", ["title"]],
    ]);
  });

  it("a user update that leaves the role out of the selection is no role change", async () => {
    const user = await createUser(ctx.payload, "select-user@x.io", {
      role: "admin",
      name: "a",
      bio: "b",
    });
    testStartedAt = await timestampAfterEverythingSoFar();

    await ctx.payload.update({
      collection: "users" as never,
      id: user.id,
      data: { name: "z" } as never,
      select: { name: true } as never,
    });

    expect(actionsAndChanges(await eventsOfThisTest("users", user.id))).toEqual([
      ["doc.update", ["name"]],
    ]);
  });

  it("a role change the selection leaves out is still a role change", async () => {
    const user = await createUser(ctx.payload, "select-role@x.io", { role: "editor", name: "a" });
    testStartedAt = await timestampAfterEverythingSoFar();

    await ctx.payload.update({
      collection: "users" as never,
      id: user.id,
      data: { role: "admin" } as never,
      select: { name: true } as never,
    });

    expect(actionsAndChanges(await eventsOfThisTest("users", user.id))).toEqual([
      ["doc.update", ["role"]],
      ["user.role_changed", ["role"]],
    ]);
  });

  it("a password change with a selection is logged by name only", async () => {
    const user = await createUser(ctx.payload, "select-password@x.io", { name: "a" });
    testStartedAt = await timestampAfterEverythingSoFar();

    await ctx.payload.update({
      collection: "users" as never,
      id: user.id,
      data: { password: "another-secret-123" } as never,
      select: { name: true } as never,
    });

    const log = await eventsOfThisTest("users", user.id);
    expect(actionsAndChanges(log)).toEqual([["doc.update", ["password"]]]);
    expect(JSON.stringify(log)).not.toContain("another-secret-123");
  });

  it("a publish the selection leaves out is still a publish", async () => {
    const post = await createPost({ title: "t" });
    testStartedAt = await timestampAfterEverythingSoFar();

    await ctx.payload.update({
      collection: "posts" as never,
      id: post.id,
      data: { _status: "published" } as never,
      select: { title: true } as never,
    });

    expect(actionsAndChanges(await eventsOfThisTest("posts", post.id))).toEqual([
      ["doc.publish", ["_status"]],
    ]);
  });

  it("switching an API key off with a selection that leaves it out is apikey.revoked", async () => {
    const integration = await ctx.payload.create({
      collection: "integrations" as never,
      data: { name: "bot", enableAPIKey: true, apiKey: "select-key-0123456789" } as never,
    });
    testStartedAt = await timestampAfterEverythingSoFar();

    await ctx.payload.update({
      collection: "integrations" as never,
      id: integration.id,
      data: { enableAPIKey: false } as never,
      select: { name: true } as never,
    });

    const log = await eventsOfThisTest("integrations", integration.id);
    expect(actionsAndChanges(log)).toEqual([["apikey.revoked", ["enableAPIKey"]]]);
    expect(JSON.stringify(log)).not.toContain("select-key-0123456789");
  });

  it("a create with a selection records the submitted fields it leaves out", async () => {
    const post = (await ctx.payload.create({
      collection: "posts" as never,
      data: { title: "t", seo: { description: "d" } } as never,
      select: { title: true } as never,
    })) as { id: unknown };

    expect(actionsAndChanges(await eventsOfThisTest("posts", post.id))).toEqual([
      ["doc.create", ["title", "seo", "_status"]],
    ]);
  });

  it("a global publish the selection leaves out is still a global publish", async () => {
    await ctx.payload.updateGlobal({
      slug: "header" as never,
      data: { title: "draft title" } as never,
      draft: true,
    });
    testStartedAt = await timestampAfterEverythingSoFar();

    await ctx.payload.updateGlobal({
      slug: "header" as never,
      data: { _status: "published" } as never,
      select: { tagline: true } as never,
    });

    expect(actionsAndChanges(await globalEventsOfThisTest("header"))).toEqual([
      ["global.publish", ["title", "_status"]],
    ]);
  });

  it("a global update records only the field that changed, not the fields left out of the selection", async () => {
    await ctx.payload.updateGlobal({
      slug: "notices" as never,
      data: { headline: "s", footer: "f" } as never,
    });
    testStartedAt = await timestampAfterEverythingSoFar();

    await ctx.payload.updateGlobal({
      slug: "notices" as never,
      data: { headline: "t" } as never,
      select: { headline: true } as never,
    });

    expect(actionsAndChanges(await globalEventsOfThisTest("notices"))).toEqual([
      ["global.update", ["headline"]],
    ]);
  });
});
