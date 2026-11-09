import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  createUser,
  loginHeaders,
  PASSWORD,
  rest,
  targetEvents,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

let ctx: AuditTestPayload;
let signedIn: Record<string, string>;
beforeAll(async () => {
  ctx = await bootAuditPayload();
  await createUser(ctx.payload, "auth-drafts@example.com", { role: "admin" });
  signedIn = await loginHeaders(ctx.payload, "auth-drafts@example.com");
});
afterAll(async () => {
  await ctx?.cleanup();
});

let testStartedAt = "";
beforeEach(async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
});

const startOfTheSavesUnderTest = async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
};

const PUBLISHED = { _status: "published" } as const;

describe.each([
  { slug: "staff", versions: "drafts with autosave" },
  { slug: "contractors", versions: "drafts without autosave" },
])("role and API key changes in an auth collection with $versions", ({ slug }) => {
  let emailCount = 0;
  const createPublished = async () => {
    emailCount += 1;
    const doc = (await ctx.payload.create({
      collection: slug as never,
      data: {
        email: `${slug}-${emailCount}@example.com`,
        password: PASSWORD,
        role: "editor",
        ...PUBLISHED,
      } as never,
    })) as unknown as { id: string };
    await startOfTheSavesUnderTest();
    return doc.id;
  };

  const save = async (id: string, query: string, body: Record<string, unknown>) => {
    const res = await rest(ctx.payload, "PATCH", `/${slug}/${id}${query}`, {
      body,
      headers: signedIn,
    });
    expect(res.status).toBe(200);
  };
  const draftSave = (id: string, body: Record<string, unknown>) => save(id, "?draft=true", body);
  const publish = (id: string) => save(id, "", PUBLISHED);

  const actionsSoFar = async (id: string) =>
    (await targetEvents(ctx.payload, slug, id, testStartedAt)).map((event) => event.action);

  const changesOf = async (id: string, action: string) =>
    (await targetEvents(ctx.payload, slug, id, testStartedAt))
      .filter((event) => event.action === action)
      .map((event) => event.changes);

  it("a role set in a draft is a draft save, then a publish", async () => {
    const id = await createPublished();

    await draftSave(id, { role: "admin" });
    expect(await actionsSoFar(id)).toEqual(["doc.update"]);
    expect(await changesOf(id, "doc.update")).toEqual([["role", "_status"]]);

    await publish(id);
    expect(await actionsSoFar(id)).toEqual(["doc.update", "doc.publish"]);
  });

  it("an API key switched on in a draft is a draft save, then a publish", async () => {
    const id = await createPublished();

    await draftSave(id, { enableAPIKey: true, apiKey: `${slug}-key-${id}` });
    expect(await actionsSoFar(id)).toEqual(["doc.update"]);

    await publish(id);
    expect(await actionsSoFar(id)).toEqual(["doc.update", "doc.publish"]);
  });

  it("a save that is not a draft save writes the draft's role and API key to the live document as an unpublish that lists them", async () => {
    const id = await createPublished();

    await draftSave(id, { role: "admin", enableAPIKey: true, apiKey: `${slug}-plain-key-${id}` });
    await save(id, "", {});

    const live = (await ctx.payload.db.findOne({
      collection: slug,
      where: { id: { equals: id } },
    })) as unknown as { role?: string; enableAPIKey?: boolean };
    expect(live).toMatchObject({ role: "admin", enableAPIKey: true });
    expect(await actionsSoFar(id)).toEqual(["doc.update", "doc.unpublish"]);
    expect(await changesOf(id, "doc.unpublish")).toEqual([
      expect.arrayContaining(["role", "enableAPIKey"]),
    ]);
  });

  it("publishing a draft that keeps the live role and API key is a plain publish", async () => {
    const id = await createPublished();

    await draftSave(id, { role: "editor" });
    await publish(id);

    expect(await actionsSoFar(id)).toEqual(["doc.update", "doc.publish"]);
  });
});

describe("role changes in an auth collection with autosave", () => {
  it("a role set by an autosave is listed by the publish", async () => {
    const staff = (await ctx.payload.create({
      collection: "staff" as never,
      data: {
        email: "autosaved-role@example.com",
        password: PASSWORD,
        role: "editor",
        ...PUBLISHED,
      } as never,
    })) as unknown as { id: string };
    await startOfTheSavesUnderTest();

    const tick = await rest(ctx.payload, "PATCH", `/staff/${staff.id}?draft=true&autosave=true`, {
      body: { role: "admin" },
      headers: signedIn,
    });
    expect(tick.status).toBe(200);
    const published = await rest(ctx.payload, "PATCH", `/staff/${staff.id}`, {
      body: PUBLISHED,
      headers: signedIn,
    });
    expect(published.status).toBe(200);

    const log = await targetEvents(ctx.payload, "staff", staff.id, testStartedAt);
    expect(log.map((event) => [event.action, event.changes])).toEqual([["doc.publish", ["role"]]]);
  });
});
