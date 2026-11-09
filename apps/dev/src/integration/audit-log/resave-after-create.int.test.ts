import type { CollectionAfterChangeHook, CollectionConfig } from "payload";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  AUDIT_SLUG,
  bootAuditPayload,
  createUser,
  events,
  loginHeaders,
  rest,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

const RESAVED = "resaved-docs";

const resaveWithPathAfterCreate: CollectionAfterChangeHook = async ({ operation, doc, req }) => {
  if (operation === "create") {
    await req.payload.update({
      collection: RESAVED as never,
      id: doc.id,
      data: { path: `/${doc.name}` } as never,
      req,
    });
  }
  return doc;
};

const collections: CollectionConfig[] = [
  {
    slug: RESAVED,
    fields: [
      { name: "name", type: "text" },
      { name: "path", type: "text" },
    ],
    hooks: { afterChange: [resaveWithPathAfterCreate] },
  },
];

let ctx: AuditTestPayload;
let signedIn: Record<string, string>;
beforeAll(async () => {
  ctx = await bootAuditPayload({ collections });
  await createUser(ctx.payload, "resave-admin@example.com", { role: "admin" });
  signedIn = await loginHeaders(ctx.payload, "resave-admin@example.com");
});
afterAll(async () => {
  await ctx?.cleanup();
});

let testStartedAt = "";
beforeEach(async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
});

const summary = (log: AuditEventRow[]) =>
  log.map((event) => [event.action, String(event.target.docId), event.changes]);

const oldestFirst = async () =>
  summary(await events(ctx.payload, { occurredAt: { greater_than_equal: testStartedAt } }));

const newestFirstAsListed = async () => {
  const { docs } = await ctx.payload.find({
    collection: AUDIT_SLUG as never,
    where: { occurredAt: { greater_than_equal: testStartedAt } } as never,
    sort: "-occurredAt",
    depth: 0,
  });
  return summary(docs as unknown as AuditEventRow[]);
};

const createResaved = (name: string) =>
  ctx.payload.create({ collection: RESAVED as never, data: { name } as never });

describe("a document saved again in the afterChange hook of its create", () => {
  it("is logged as created before it is updated", async () => {
    const doc = await createResaved("first");
    const id = String(doc.id);

    expect(await oldestFirst()).toEqual([
      ["doc.create", id, ["name"]],
      ["doc.update", id, ["path"]],
    ]);
    expect(await newestFirstAsListed()).toEqual([
      ["doc.update", id, ["path"]],
      ["doc.create", id, ["name"]],
    ]);
  });

  it("is logged as created before it is updated when created over REST", async () => {
    const res = await rest(ctx.payload, "POST", `/${RESAVED}`, {
      body: { name: "rest" },
      headers: signedIn,
    });
    const { doc } = (await res.json()) as { doc: { id: string | number } };
    const id = String(doc.id);

    expect(await newestFirstAsListed()).toEqual([
      ["doc.update", id, ["path"]],
      ["doc.create", id, ["name"]],
    ]);
  });

  it("keeps sequential operations and a bulk update in the order they ran", async () => {
    const first = String((await createResaved("a")).id);
    const second = String((await createResaved("b")).id);
    await ctx.payload.update({
      collection: RESAVED as never,
      where: { id: { in: [first, second] } } as never,
      data: { name: "renamed" } as never,
    });

    const log = await oldestFirst();
    expect(log.slice(0, 4)).toEqual([
      ["doc.create", first, ["name"]],
      ["doc.update", first, ["path"]],
      ["doc.create", second, ["name"]],
      ["doc.update", second, ["path"]],
    ]);
    expect(log.slice(4)).toHaveLength(2);
    expect(log.slice(4)).toEqual(
      expect.arrayContaining([
        ["doc.update", first, ["name"]],
        ["doc.update", second, ["name"]],
      ])
    );
  });
});
