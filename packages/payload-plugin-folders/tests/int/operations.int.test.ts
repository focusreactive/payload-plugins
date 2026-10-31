import { createPayloadRequest } from "payload";
import type { Payload, PayloadRequest } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  registerOperationHandler,
  runOrQueue,
  startOperation,
  stepOperation,
} from "../../src/core/operations.js";
import type { OperationProgress } from "../../src/core/operations.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";

type Unit = { n: number };

const password = "test-password";
const ownerEmail = "operation-owner@example.com";

let harness: TestPayload;
let ownerRequest: PayloadRequest;
/** The unit number at which the stand-in handler throws once, after writing the units before it. */
let failAtUnit: number | null = null;
let targetPageId: number;
const processed: number[] = [];

const standInKind = "mirrorRedirects";

const countRows = async (payload: Payload): Promise<number> =>
  (
    await payload.db.count({
      collection: "folder-redirects" as never,
      where: { lookupKey: { like: "-:/operation-test/" } },
    })
  ).totalDocs;

const countOperations = async (payload: Payload): Promise<number> =>
  (await payload.db.count({ collection: "folder-operations" as never })).totalDocs;

const units = (count: number): Unit[] =>
  Array.from({ length: count }, (_, index) => ({ n: index }));

beforeAll(async () => {
  harness = await getTestPayload();
  const { payload } = harness;
  targetPageId = (
    await payload.create({
      collection: "pages",
      data: { slug: "operation-target", title: "Operation target" },
      depth: 0,
      overrideAccess: true,
    })
  ).id;
  const owner = await payload.create({
    collection: "users",
    data: { email: ownerEmail, password, role: "editor" } as never,
    overrideAccess: true,
  });
  ownerRequest = await createPayloadRequest({
    payload,
    req: {},
    user: { ...owner, collection: "users" } as never,
  });

  // A stand-in for an operation of a later ticket: each unit writes one row, so a rolled-back step
  // shows as missing rows and a repeated unit as a unique key error.
  registerOperationHandler(standInKind, {
    run: async ({ req }, batch) => {
      for (const unit of batch as Unit[]) {
        if (failAtUnit === unit.n) {
          failAtUnit = null;
          throw new Error("The stand-in failed on purpose");
        }
        await req.payload.db.create({
          collection: "folder-redirects" as never,
          data: {
            createdAt: new Date().toISOString(),
            fromPath: `/operation-test/${unit.n}`,
            kind: "page",
            locale: null,
            lookupKey: `-:/operation-test/${unit.n}`,
            target: { relationTo: "pages", value: targetPageId },
            updatedAt: new Date().toISOString(),
          },
          req,
        });
        processed.push(unit.n);
      }
    },
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  failAtUnit = null;
  processed.length = 0;
  await harness.payload.db.deleteMany({
    collection: "folder-redirects" as never,
    where: { id: { exists: true } },
  });
  await harness.payload.db.deleteMany({
    collection: "folder-operations" as never,
    where: { id: { exists: true } },
  });
});

const stepAs = async (id: number | string, user?: { email: string; password: string }) =>
  callEndpoint<OperationProgress & { errors?: unknown[] }>({
    config: harness.config,
    method: "POST",
    path: `/folders-tree/operations/${id}/step`,
    payload: harness.payload,
    payloadInstanceCacheKey: harness.cacheKey,
    ...(user ? { user } : {}),
  });

describe("the batch runner", () => {
  it("500 items run in three steps", async () => {
    const { id, total } = await startOperation({
      items: units(500),
      kind: standInKind,
      req: ownerRequest,
    });
    expect(total).toBe(500);
    expect(await countRows(harness.payload)).toBe(0);

    const first = await stepOperation(ownerRequest, id);
    const second = await stepOperation(ownerRequest, id);
    const third = await stepOperation(ownerRequest, id);

    expect(first).toEqual({ done: 200, status: "running", total: 500 });
    expect(second).toEqual({ done: 400, status: "running", total: 500 });
    expect(third).toEqual({ done: 500, status: "done", total: 500 });
    expect(processed).toEqual(units(500).map((unit) => unit.n));
    expect(await countRows(harness.payload)).toBe(500);
  });

  it("a failed step can be retried without duplicating work", async () => {
    const { id } = await startOperation({
      items: units(500),
      kind: standInKind,
      req: ownerRequest,
    });
    await stepOperation(ownerRequest, id);

    // The second step writes units 200 to 249 and then throws.
    failAtUnit = 250;
    const failed = await stepOperation(ownerRequest, id);

    expect(failed).toMatchObject({
      done: 200,
      error: "The stand-in failed on purpose",
      status: "failed",
      total: 500,
    });
    // The whole step rolled back, the units it had already written included.
    expect(await countRows(harness.payload)).toBe(200);

    const retried = await stepOperation(ownerRequest, id);
    const last = await stepOperation(ownerRequest, id);

    expect(retried).toEqual({ done: 400, status: "running", total: 500 });
    expect(last).toEqual({ done: 500, status: "done", total: 500 });
    expect(await countRows(harness.payload)).toBe(500);
    // Units 200 to 249 ran twice (once rolled back) and every unit has exactly one row.
    expect(new Set(processed).size).toBe(500);
  });

  it("status is done after the last step", async () => {
    const { id } = await startOperation({
      items: units(201),
      kind: standInKind,
      req: ownerRequest,
    });

    expect(await stepOperation(ownerRequest, id)).toEqual({
      done: 200,
      status: "running",
      total: 201,
    });
    expect(await stepOperation(ownerRequest, id)).toEqual({
      done: 201,
      status: "done",
      total: 201,
    });
    // Stepping a finished operation changes nothing.
    expect(await stepOperation(ownerRequest, id)).toEqual({
      done: 201,
      status: "done",
      total: 201,
    });

    const stored = (await harness.payload.db.findOne({
      collection: "folder-operations" as never,
      where: { id: { equals: id } },
    })) as unknown as { done: number; status: string };
    expect(stored).toMatchObject({ done: 201, status: "done" });
    expect(await countRows(harness.payload)).toBe(201);
  });

  it("200 items or fewer run synchronously", async () => {
    const small = await runOrQueue({ kind: standInKind, req: ownerRequest, units: units(200) });

    expect(small.queued).toBe(false);
    expect(await countRows(harness.payload)).toBe(200);
    expect(await countOperations(harness.payload)).toBe(0);

    const large = await runOrQueue({ kind: standInKind, req: ownerRequest, units: units(201) });

    expect(large.queued).toBe(true);
    expect(await countOperations(harness.payload)).toBe(1);
    // Queued work waits for the first step.
    expect(await countRows(harness.payload)).toBe(200);
  });

  it("stepping someone else's operation is 403", async () => {
    const { id } = await startOperation({
      items: units(300),
      kind: standInKind,
      req: ownerRequest,
    });

    // The default test user is an admin and still not the owner.
    const refused = await stepAs(id);
    const anonymous = await callEndpoint({
      anonymous: true,
      config: harness.config,
      method: "POST",
      path: `/folders-tree/operations/${id}/step`,
      payload: harness.payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });
    expect(refused.status).toBe(403);
    expect(anonymous.status).toBe(403);
    expect(await countRows(harness.payload)).toBe(0);

    const owned = await stepAs(id, { email: ownerEmail, password });

    expect(owned.status).toBe(200);
    expect(await countRows(harness.payload)).toBe(200);
    expect(owned.body).toEqual({ done: 200, status: "running", total: 300 });
  });
});
