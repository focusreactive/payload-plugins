import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  createUser,
  events,
  HEADER_HOOK_FLAGS,
  loginHeaders,
  rest,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

let ctx: AuditTestPayload;
let signedInEditor: Record<string, string>;
beforeAll(async () => {
  ctx = await bootAuditPayload();
  await createUser(ctx.payload, "g@x.io");
  signedInEditor = await loginHeaders(ctx.payload, "g@x.io");
});
afterAll(async () => {
  await ctx?.cleanup();
});

let testStartedAt = "";
beforeEach(async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
});

const globalEvents = (slug: string, occurredSince = testStartedAt) =>
  events(ctx.payload, {
    and: [
      { "target.kind": { equals: "global" } },
      { "target.slug": { equals: slug } },
      { occurredAt: { greater_than_equal: occurredSince } },
    ],
  });

const updateGlobal = (slug: string, data: Record<string, unknown>, options = {}) =>
  ctx.payload.updateGlobal({ slug: slug as never, data: data as never, ...options });

const autosaveTickOverRest = async (slug: string, body: Record<string, unknown>) => {
  const res = await rest(ctx.payload, "POST", `/globals/${slug}?draft=true&autosave=true`, {
    body,
    headers: signedInEditor,
  });
  expect(res.status).toBe(200);
};

describe("globals", () => {
  it("the first update lists only the fields it set, not the fields that were never set", async () => {
    await updateGlobal("notices", { headline: "first" });

    const log = await globalEvents("notices");
    expect(log.map((event) => [event.action, event.changes])).toEqual([
      ["global.update", ["headline"]],
    ]);
  });

  it("the first update (which creates the global row) is one global.update with the changed fields; a no-op save is nothing; the project's own afterChange hook still runs", async () => {
    const hookCallsBefore = ctx.settingsAfterChangeHookCalls();
    await updateGlobal("settings", { siteName: "X" });
    await updateGlobal("settings", { siteName: "X" });

    const log = await globalEvents("settings");
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      action: "global.update",
      target: { kind: "global", slug: "settings" },
      changes: ["siteName"],
      via: "local",
    });
    expect(log[0]?.target.locale ?? null).toBeNull();
    expect(ctx.settingsAfterChangeHookCalls()).toBe(hookCallsBefore + 2);
  });

  it("REST update is via rest; an autosave tick over REST is not recorded", async () => {
    const res = await rest(ctx.payload, "POST", "/globals/settings", {
      body: { siteName: "Rest" },
      headers: signedInEditor,
    });
    expect(res.status).toBe(200);
    await autosaveTickOverRest("header", { title: "tick" });

    expect((await globalEvents("settings")).map((event) => [event.action, event.via])).toEqual([
      ["global.update", "rest"],
    ]);
    expect(await globalEvents("header")).toHaveLength(0);
  });

  it("autosave global: the first publish lists all fields, the next lists changes since the last publish, and a manual draft save over the published global is an update that includes _status", async () => {
    await autosaveTickOverRest("header", { title: "T1", tagline: "G1" });
    await updateGlobal("header", { _status: "published" });
    await autosaveTickOverRest("header", { tagline: "G2" });
    await autosaveTickOverRest("header", { tagline: "G3" });
    await updateGlobal("header", { _status: "published" });
    await updateGlobal("header", { title: "T2" }, { draft: true });

    const log = await globalEvents("header");
    expect(log.map((event) => event.action)).toEqual([
      "global.publish",
      "global.publish",
      "global.update",
    ]);
    expect(log[0]?.changes).toEqual(expect.arrayContaining(["title", "tagline", "_status"]));
    expect(log[1]?.changes).toEqual(["tagline"]);
    expect(log[2]?.changes).toEqual(["title", "_status"]);
  });

  it("restoreGlobalVersion is exactly one event", async () => {
    const versions = await ctx.payload.findGlobalVersions({
      slug: "header" as never,
      sort: "createdAt",
      where: { "version._status": { equals: "published" } },
    });
    const restoredAt = await timestampAfterEverythingSoFar();
    await ctx.payload.restoreGlobalVersion({
      slug: "header" as never,
      id: String(versions.docs[0]?.id),
    });

    const log = await globalEvents("header", restoredAt);
    expect(log).toHaveLength(1);
    expect(log[0]?.target).toMatchObject({ kind: "global", slug: "header" });
  });

  it("target.locale is recorded only for a localized global", async () => {
    await updateGlobal("localized-settings", { motto: "Hallo" }, { locale: "de" });
    const [event] = await globalEvents("localized-settings");
    expect(event?.target).toMatchObject({
      kind: "global",
      slug: "localized-settings",
      locale: "de",
    });
    expect(event?.changes).toEqual(["motto"]);
  });

  it("a publish after autosaves lists the changes since the previous publish, also when project hooks read the global during the save", async () => {
    await autosaveTickOverRest("header", { title: "P1", tagline: "P1" });
    await updateGlobal("header", { _status: "published" });
    const publishedAt = await timestampAfterEverythingSoFar();
    await autosaveTickOverRest("header", { title: "P2" });
    await autosaveTickOverRest("header", { tagline: "P2" });
    await autosaveTickOverRest("header", { title: "P1" });
    await updateGlobal(
      "header",
      { _status: "published" },
      { context: { [HEADER_HOOK_FLAGS.readHeaderTaglineInHooks]: true } }
    );

    const log = await globalEvents("header", publishedAt);
    expect(log.map((event) => [event.action, event.changes])).toEqual([
      ["global.publish", ["tagline"]],
    ]);
  });

  it("unpublishing a published global is global.unpublish, and the next publish lists the changes since the unpublish", async () => {
    await autosaveTickOverRest("header", { title: "U1", tagline: "U1" });
    await updateGlobal("header", { _status: "published" });
    const publishedAt = await timestampAfterEverythingSoFar();
    await updateGlobal("header", { title: "U2", _status: "draft" });
    await autosaveTickOverRest("header", { tagline: "U3" });
    await updateGlobal("header", { _status: "published" });

    const log = await globalEvents("header", publishedAt);
    expect(log.map((event) => [event.action, event.changes])).toEqual([
      ["global.unpublish", ["title", "_status"]],
      ["global.publish", ["tagline", "_status"]],
    ]);
  });

  it("a draft save behind the published global is not an unpublish", async () => {
    await autosaveTickOverRest("header", { title: "D1" });
    await updateGlobal("header", { _status: "published" });
    const publishedAt = await timestampAfterEverythingSoFar();
    await updateGlobal("header", { title: "D2" }, { draft: true });
    await updateGlobal("header", { title: "D3" }, { draft: true });

    expect((await globalEvents("header", publishedAt)).map((event) => event.action)).toEqual([
      "global.update",
      "global.update",
    ]);
  });
});
