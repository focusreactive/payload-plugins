import { setImmediate as nextMacrotask } from "node:timers/promises";

import { createLocalReq } from "payload";
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  Field,
  PayloadRequest,
} from "payload";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  PASSWORD,
  targetEvents,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

type Deferred = { promise: Promise<void>; resolve: () => void };
type Step = { reached: Deferred; until: Promise<unknown> };
type Saved = { id: string };

const POSTS = "overlapping-posts";
const MEMBERS = "overlapping-members";
const NESTED = "touchedByNestedBulkUpdate";
const NESTED_NOTE = "touched";

const deferred = (): Deferred => {
  let resolveStep: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolveStep = resolve;
  });
  return { promise, resolve: () => resolveStep?.() };
};

const stepsBeforeChange = new Map<string, Step>();
const afterChangeSignals = new Map<string, Deferred>();
const nestedBulkTargets = new Map<string, string>();

const waitAtStep: CollectionBeforeChangeHook = async ({ data, originalDoc }) => {
  const step = stepsBeforeChange.get(String(originalDoc?.id));
  if (!step) return data;
  step.reached.resolve();
  await step.until;
  return data;
};

const runNestedBulkUpdate =
  (collection: string): CollectionAfterChangeHook =>
  async ({ doc, req, context }) => {
    afterChangeSignals.get(String(doc.id))?.resolve();
    const target = nestedBulkTargets.get(String(doc.id));
    if (context[NESTED] || target === undefined) return doc;
    await req.payload.update({
      collection: collection as never,
      where: { id: { equals: target } },
      data: { note: NESTED_NOTE } as never,
      req,
      context: { [NESTED]: true },
    });
    return doc;
  };

const postFields: Field[] = [
  { name: "title", type: "text" },
  { name: "note", type: "text" },
  { name: "group", type: "text" },
];

const COLLECTIONS: CollectionConfig[] = [
  {
    slug: POSTS,
    versions: { drafts: true },
    fields: postFields,
    hooks: { beforeChange: [waitAtStep], afterChange: [runNestedBulkUpdate(POSTS)] },
  },
  {
    slug: MEMBERS,
    auth: true,
    fields: [{ name: "role", type: "text" }],
    hooks: { beforeChange: [waitAtStep] },
  },
];

let ctx: AuditTestPayload;
beforeAll(async () => {
  ctx = await bootAuditPayload({ collections: COLLECTIONS });
});
afterAll(async () => {
  await ctx?.cleanup();
});

let testStartedAt = "";
beforeEach(async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
});
afterEach(() => {
  stepsBeforeChange.clear();
  afterChangeSignals.clear();
  nestedBulkTargets.clear();
});

const startOfTheSavesUnderTest = async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
};

const docEventsOfThisTest = async (collection: string, id: string) =>
  (await targetEvents(ctx.payload, collection, id, testStartedAt)).map((event) => [
    event.action,
    event.changes,
  ]);

const savedId = (doc: { id: unknown }): Saved => ({ id: String(doc.id) });

const createPost = async (title: string, group = "other") =>
  savedId(
    await ctx.payload.create({
      collection: POSTS as never,
      data: { title, group, _status: "published" } as never,
      context: { [NESTED]: true },
    })
  );

const createMember = async (email: string) =>
  savedId(
    await ctx.payload.create({
      collection: MEMBERS as never,
      data: { email, password: PASSWORD } as never,
    })
  );

const publishedTitles = async (ids: string[]) => {
  const { docs } = await ctx.payload.find({
    collection: POSTS as never,
    where: { id: { in: ids } },
    sort: "title",
  });
  return docs.map((doc) => [(doc as { title?: string }).title, doc._status]);
};

const trackingLeftIn = (req: PayloadRequest) =>
  Object.entries(req.context)
    .filter(([, value]) => value instanceof Map && value.size > 0)
    .map(([key]) => key);

const overlapping = async (
  first: { id: string; save: () => Promise<unknown> },
  second: { id: string; save: () => Promise<unknown> }
) => {
  const firstReached = deferred();
  const secondReached = deferred();
  stepsBeforeChange.set(first.id, { reached: firstReached, until: secondReached.promise });
  const firstSave = first.save();
  await firstReached.promise;
  stepsBeforeChange.set(second.id, { reached: secondReached, until: firstSave });
  await Promise.all([firstSave, second.save()]);
};

describe("a save that runs while a later bulk update on the same request is still running", () => {
  it("keeps a draft save of a published post a doc.update", async () => {
    const draftSaved = await createPost("P");
    const bulkUpdated = await createPost("Q");
    const req = await createLocalReq({}, ctx.payload);
    await startOfTheSavesUnderTest();
    await overlapping(
      {
        id: draftSaved.id,
        save: () =>
          ctx.payload.update({
            collection: POSTS as never,
            id: draftSaved.id,
            data: { title: "P-draft" } as never,
            draft: true,
            req,
          }),
      },
      {
        id: bulkUpdated.id,
        save: () =>
          ctx.payload.update({
            collection: POSTS as never,
            where: { id: { equals: bulkUpdated.id } },
            data: { note: "bulk" } as never,
            req,
          }),
      }
    );
    expect(await docEventsOfThisTest(POSTS, draftSaved.id)).toEqual([
      ["doc.update", ["title", "_status"]],
    ]);
    expect(await docEventsOfThisTest(POSTS, bulkUpdated.id)).toEqual([["doc.update", ["note"]]]);
    expect(trackingLeftIn(req)).toEqual([]);
  });

  it("records a password change and leaves no flags of it on the request", async () => {
    const passwordChanged = await createMember("overlap-u@x.io");
    const bulkUpdated = await createMember("overlap-v@x.io");
    const req = await createLocalReq({}, ctx.payload);
    await startOfTheSavesUnderTest();
    await overlapping(
      {
        id: passwordChanged.id,
        save: () =>
          ctx.payload.update({
            collection: MEMBERS as never,
            id: passwordChanged.id,
            data: { password: "changed-password" } as never,
            req,
          }),
      },
      {
        id: bulkUpdated.id,
        save: () =>
          ctx.payload.update({
            collection: MEMBERS as never,
            where: { id: { equals: bulkUpdated.id } },
            data: { role: "admin" } as never,
            req,
          }),
      }
    );
    expect(await docEventsOfThisTest(MEMBERS, passwordChanged.id)).toEqual([
      ["doc.update", ["password"]],
    ]);
    expect(await docEventsOfThisTest(MEMBERS, bulkUpdated.id)).toEqual([["doc.update", ["role"]]]);
    expect(trackingLeftIn(req)).toEqual([]);
  });

  it("keeps a bulk draft save a doc.update", async () => {
    const draftSaved = await createPost("P2");
    const bulkUpdated = await createPost("Q2");
    const req = await createLocalReq({}, ctx.payload);
    await startOfTheSavesUnderTest();
    await overlapping(
      {
        id: draftSaved.id,
        save: () =>
          ctx.payload.update({
            collection: POSTS as never,
            where: { id: { equals: draftSaved.id } },
            data: { title: "P2-draft" } as never,
            draft: true,
            req,
          }),
      },
      {
        id: bulkUpdated.id,
        save: () =>
          ctx.payload.update({
            collection: POSTS as never,
            where: { id: { equals: bulkUpdated.id } },
            data: { note: "bulk" } as never,
            req,
          }),
      }
    );
    expect(await docEventsOfThisTest(POSTS, draftSaved.id)).toEqual([
      ["doc.update", ["title", "_status"]],
    ]);
    expect(await docEventsOfThisTest(POSTS, bulkUpdated.id)).toEqual([["doc.update", ["note"]]]);
    expect(trackingLeftIn(req)).toEqual([]);
  });
});

describe("a bulk update that one of its documents' afterChange hooks runs", () => {
  it("does not give its flags to the other documents of the outer bulk update", async () => {
    const touching = await createPost("X", "drafted");
    const sibling = await createPost("Y", "drafted");
    const touched = await createPost("Z");
    nestedBulkTargets.set(touching.id, touched.id);
    const siblingSaved = deferred();
    afterChangeSignals.set(sibling.id, siblingSaved);
    const touchedReached = deferred();
    stepsBeforeChange.set(sibling.id, { reached: deferred(), until: touchedReached.promise });
    stepsBeforeChange.set(touched.id, {
      reached: touchedReached,
      until: siblingSaved.promise.then(() => nextMacrotask()),
    });
    await startOfTheSavesUnderTest();
    await ctx.payload.update({
      collection: POSTS as never,
      where: { group: { equals: "drafted" } },
      data: { title: "renamed" } as never,
      draft: true,
    });
    expect(await publishedTitles([touching.id, sibling.id])).toEqual([
      ["X", "published"],
      ["Y", "published"],
    ]);
    expect(await docEventsOfThisTest(POSTS, touching.id)).toEqual([
      ["doc.update", ["title", "_status"]],
    ]);
    expect(await docEventsOfThisTest(POSTS, sibling.id)).toEqual([
      ["doc.update", ["title", "_status"]],
    ]);
    expect(await docEventsOfThisTest(POSTS, touched.id)).toEqual([["doc.update", ["note"]]]);
  });
});
