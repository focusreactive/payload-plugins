import { mergeListSearchAndWhere } from "payload/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  AUDIT_SLUG,
  bootAuditPayload,
  createUser,
  events,
  eventsWithAction,
  loginHeaders,
  PASSWORD,
  rest,
} from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

const ADMIN_EMAIL = "a@x.io";
const MEMBER_EMAIL = "member@x.io";
const DAY_MS = 24 * 60 * 60 * 1000;

let ctx: AuditTestPayload;
let admin: Record<string, any>;

beforeAll(async () => {
  ctx = await bootAuditPayload({ plugin: { retention: { days: 30 } } });
  admin = await createUser(ctx.payload, ADMIN_EMAIL);
  await ctx.payload.create({ collection: "posts" as never, data: { title: "E" } as never });
});
afterAll(async () => {
  await ctx?.cleanup();
});

const firstEvent = async (): Promise<AuditEventRow> => {
  const [event] = await events(ctx.payload);
  expect(event).toBeDefined();
  return event as AuditEventRow;
};

const exportAs = async (format: "csv" | "ndjson", email = ADMIN_EMAIL) =>
  rest(ctx.payload, "GET", `/${AUDIT_SLUG}/export?format=${format}`, {
    headers: await loginHeaders(ctx.payload, email),
  });

const ndjsonRows = async (res: Response) =>
  (await res.text())
    .trimEnd()
    .split("\n")
    .map(
      (line) =>
        JSON.parse(line) as {
          id: unknown;
          action: string;
          requestId?: string;
          target: { docId: string };
        }
    );

const eventsWithRequestId = (requestId: string) =>
  events(ctx.payload, { requestId: { equals: requestId } });

const insertRawEvent = (data: Record<string, unknown>) =>
  ctx.payload.db.create({
    collection: AUDIT_SLUG,
    data: { status: "success", actor: { type: "system", source: "inferred" }, ...data },
    returning: false,
  });

describe("journal access", () => {
  it("nobody can create, update or delete events through the API", async () => {
    const event = await firstEvent();
    const asAdmin = { user: { ...admin, collection: "users" }, overrideAccess: false } as const;
    await expect(
      ctx.payload.create({ collection: AUDIT_SLUG as never, data: {} as never, ...asAdmin })
    ).rejects.toThrow();
    await expect(
      ctx.payload.update({
        collection: AUDIT_SLUG as never,
        id: event.id,
        data: {} as never,
        ...asAdmin,
      })
    ).rejects.toThrow();
    await expect(
      ctx.payload.delete({ collection: AUDIT_SLUG as never, id: event.id, ...asAdmin })
    ).rejects.toThrow();

    const headers = await loginHeaders(ctx.payload, ADMIN_EMAIL);
    const restCreate = await rest(ctx.payload, "POST", `/${AUDIT_SLUG}`, { body: {}, headers });
    expect(restCreate.status).toBe(403);
    const restDelete = await rest(ctx.payload, "DELETE", `/${AUDIT_SLUG}/${event.id}`, { headers });
    expect(restDelete.status).toBe(403);
  });

  it("the Local API cannot forge events even though it skips access control", async () => {
    const forged = {
      action: "system.seed",
      occurredAt: new Date().toISOString(),
      requestId: "forged",
    } as never;
    await expect(
      ctx.payload.create({ collection: AUDIT_SLUG as never, data: forged })
    ).rejects.toThrow();
    expect(await eventsWithRequestId("forged")).toEqual([]);
  });

  it("the Local API cannot rewrite or delete events even though it skips access control", async () => {
    const event = await firstEvent();
    const byId = { id: { equals: event.id } } as never;
    await expect(
      ctx.payload.update({ collection: AUDIT_SLUG as never, id: event.id, data: {} as never })
    ).rejects.toThrow();
    await expect(
      ctx.payload.update({
        collection: AUDIT_SLUG as never,
        where: byId,
        data: { action: "system.seed" } as never,
      })
    ).rejects.toThrow();
    await expect(
      ctx.payload.delete({ collection: AUDIT_SLUG as never, id: event.id })
    ).rejects.toThrow();
    await expect(
      ctx.payload.delete({ collection: AUDIT_SLUG as never, where: byId })
    ).rejects.toThrow();

    const [unchanged] = await events(ctx.payload, { id: { equals: event.id } });
    expect(unchanged?.action).toBe(event.action);
  });

  it("only admin users can read the journal", async () => {
    const adminRead = await rest(ctx.payload, "GET", `/${AUDIT_SLUG}`, {
      headers: await loginHeaders(ctx.payload, ADMIN_EMAIL),
    });
    expect(adminRead.status).toBe(200);

    await ctx.payload.create({
      collection: "members" as never,
      data: { email: MEMBER_EMAIL, password: PASSWORD, _verified: true } as never,
    });
    const memberRead = await rest(ctx.payload, "GET", `/${AUDIT_SLUG}`, {
      headers: await loginHeaders(ctx.payload, MEMBER_EMAIL, "members"),
    });
    expect(memberRead.status).toBe(403);
    expect((await rest(ctx.payload, "GET", `/${AUDIT_SLUG}`)).status).toBe(403);
  });

  it("export returns csv for the admin and records itself", async () => {
    const res = await exportAs("csv");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const [header, ...lines] = (await res.text()).trimEnd().split("\n");
    expect(header).toContain("occurredAt,action");
    expect(header).toContain("target.docId");
    expect(lines.some((line) => line.includes("doc.create"))).toBe(true);

    const exports = await eventsWithAction(ctx.payload, "audit.export");
    expect(exports).toHaveLength(1);
    expect(exports[0]).toMatchObject({
      actor: { type: "user", docId: String(admin.id) },
      via: "rest",
      metadata: { format: "csv" },
    });
  });

  it("export is ndjson on request; refused to anonymous and non-admin users, and refusals are not recorded as exports", async () => {
    const ndjson = await exportAs("ndjson");
    expect(ndjson.status).toBe(200);
    const [first] = await ndjsonRows(ndjson);
    expect(first).toHaveProperty("action");

    expect((await rest(ctx.payload, "GET", `/${AUDIT_SLUG}/export`)).status).toBe(401);
    const member = await rest(ctx.payload, "GET", `/${AUDIT_SLUG}/export`, {
      headers: await loginHeaders(ctx.payload, MEMBER_EMAIL, "members"),
    });
    expect(member.status).toBe(403);
    expect(await eventsWithAction(ctx.payload, "audit.export")).toHaveLength(2);
  });

  it("export spanning several pages, with page boundaries inside one millisecond, lists every row once, newest first", async () => {
    const bulkRows = 1150;
    const rowsPerMillisecond = 5;
    const start = Date.UTC(2020, 0, 1);
    for (let i = 0; i < bulkRows; i += 1) {
      await insertRawEvent({
        occurredAt: new Date(start + Math.floor(i / rowsPerMillisecond)).toISOString(),
        action: "system.seed",
        target: { kind: "audit", slug: AUDIT_SLUG, docId: String(i) },
        requestId: "bulk",
      });
    }

    const res = await exportAs("ndjson");
    expect(res.status).toBe(200);
    const rows = await ndjsonRows(res);
    expect(new Set(rows.map((row) => String(row.id))).size).toBe(rows.length);
    const bulk = rows
      .filter((row) => row.requestId === "bulk")
      .map((row) => Number(row.target.docId));
    expect(bulk).toHaveLength(bulkRows);
    expect(new Set(bulk).size).toBe(bulkRows);
    expect(bulk[0]).toBe(bulkRows - 1);
    expect(bulk.at(-1)).toBe(0);
  });

  it("the retention purge still deletes old events (it bypasses the operation hooks)", async () => {
    await insertRawEvent({
      occurredAt: "2001-01-01T00:00:00.000Z",
      action: "system.seed",
      target: { kind: "audit", slug: AUDIT_SLUG },
      requestId: "ancient",
    });
    expect(await eventsWithRequestId("ancient")).toHaveLength(1);
    const { totalDocs: olderThan30Days } = await ctx.payload.count({
      collection: AUDIT_SLUG as never,
      where: { occurredAt: { less_than: new Date(Date.now() - 30 * DAY_MS).toISOString() } },
    });
    expect(olderThan30Days).toBeGreaterThan(0);

    await ctx.payload.jobs.queue({ task: "auditLogPurge" as never, input: {} as never });
    await ctx.payload.jobs.run();

    expect(await eventsWithRequestId("ancient")).toHaveLength(0);
    const purges = await eventsWithAction(ctx.payload, "audit.retention_purge");
    expect(purges).toHaveLength(1);
    expect(purges[0]?.metadata).toMatchObject({ deleted: olderThan30Days, days: 30 });
  });

  it("a purge with nothing old enough deletes nothing and records deleted 0", async () => {
    await ctx.payload.jobs.queue({ task: "auditLogPurge" as never, input: {} as never });
    await ctx.payload.jobs.run();

    const purges = await eventsWithAction(ctx.payload, "audit.retention_purge");
    expect(purges.at(-1)?.metadata?.deleted).toBe(0);
    expect(purges).toHaveLength(2);
  });
});

describe("list view", () => {
  const searchAsTheListView = async (search: string) => {
    const where = mergeListSearchAndWhere({
      collectionConfig: ctx.payload.collections[AUDIT_SLUG as never].config,
      search,
    });
    const { docs } = await ctx.payload.find({
      collection: AUDIT_SLUG as never,
      where,
      limit: 0,
      depth: 0,
    });
    return docs as unknown as AuditEventRow[];
  };

  it("search matches the action, the actor label, the target label and the target id", async () => {
    const searcher = await createUser(ctx.payload, "searcher@x.io");
    const post = await ctx.payload.create({
      collection: "posts" as never,
      data: { title: "Findable headline" } as never,
      user: searcher,
    });

    const byActor = await searchAsTheListView("searcher@x");
    expect(byActor.map((event) => event.target.docId)).toContain(String(post.id));
    const byTarget = await searchAsTheListView("findable head");
    expect(byTarget.map((event) => event.actor.label)).toEqual(["searcher@x.io"]);
    const byTargetId = await searchAsTheListView(String(post.id));
    expect(byTargetId.map((event) => event.target.docId)).toContain(String(post.id));
    const byAction = await searchAsTheListView("doc.create");
    expect(new Set(byAction.map((event) => event.action))).toEqual(new Set(["doc.create"]));

    const exported = await rest(
      ctx.payload,
      "GET",
      `/${AUDIT_SLUG}/export?format=ndjson&search=findable%20head&where[action][equals]=doc.create`,
      { headers: await loginHeaders(ctx.payload, ADMIN_EMAIL) }
    );
    expect(exported.status).toBe(200);
    const exportedRows = await ndjsonRows(exported);
    expect(exportedRows.map((row) => [row.action, row.target.docId])).toEqual([
      ["doc.create", String(post.id)],
    ]);
  });

  it("lists the newest events first by default", async () => {
    const { docs } = await ctx.payload.find({
      collection: AUDIT_SLUG as never,
      limit: 0,
      depth: 0,
    });
    const occurredAt = (docs as unknown as AuditEventRow[]).map((event) =>
      String(event.occurredAt)
    );
    expect(occurredAt).toEqual([...occurredAt].sort().reverse());
  });
});
