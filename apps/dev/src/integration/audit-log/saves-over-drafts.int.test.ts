import type {
  CollectionAfterChangeHook,
  CollectionConfig,
  Field,
  GlobalAfterChangeHook,
  GlobalConfig,
} from "payload";
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

const AUTOSAVE = { drafts: { autosave: true } } as const;
const PUBLISHED = { _status: "published" } as const;
const TOUCHED = "touched";
const SAVED_AGAIN = "savedAgainByHook";

const fields: Field[] = [
  { name: "title", type: "text", localized: true },
  { name: "note", type: "text" },
];

const saveCollectionDocAgain: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context[SAVED_AGAIN] || doc._status !== "published") return doc;
  await req.payload.update({
    collection: "rewritten-pages" as never,
    id: doc.id,
    data: { note: TOUCHED } as never,
    req,
    context: { [SAVED_AGAIN]: true },
  });
  return doc;
};

const saveGlobalAgain: GlobalAfterChangeHook = async ({ doc, req, context }) => {
  if (context[SAVED_AGAIN] || doc._status !== "published") return doc;
  await req.payload.updateGlobal({
    slug: "rewritten-settings" as never,
    data: { note: TOUCHED } as never,
    req,
    context: { [SAVED_AGAIN]: true },
  });
  return doc;
};

const COLLECTIONS: CollectionConfig[] = [
  { slug: "plain-pages", versions: AUTOSAVE, fields },
  {
    slug: "rewritten-pages",
    versions: AUTOSAVE,
    fields,
    hooks: { afterChange: [saveCollectionDocAgain] },
  },
];

const GLOBALS: GlobalConfig[] = [
  { slug: "plain-settings", versions: AUTOSAVE, fields },
  {
    slug: "rewritten-settings",
    versions: AUTOSAVE,
    fields,
    hooks: { afterChange: [saveGlobalAgain] },
  },
];

let ctx: AuditTestPayload;
let signedIn: Record<string, string>;
beforeAll(async () => {
  ctx = await bootAuditPayload({ collections: COLLECTIONS, globals: GLOBALS });
  await createUser(ctx.payload, "saves-over-drafts@x.io", { role: "admin" });
  signedIn = await loginHeaders(ctx.payload, "saves-over-drafts@x.io");
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

const actionsAndChanges = (log: AuditEventRow[]) =>
  log.map((event) => [event.action, event.changes]);

const docEventsOfThisTest = async (collection: string, id: unknown) =>
  actionsAndChanges(await targetEvents(ctx.payload, collection, id, testStartedAt));

const globalEventsOfThisTest = async (slug: string) =>
  actionsAndChanges(
    await events(ctx.payload, {
      and: [
        { "target.kind": { equals: "global" } },
        { "target.slug": { equals: slug } },
        { occurredAt: { greater_than_equal: testStartedAt } },
      ],
    })
  );

const send = async (method: "PATCH" | "POST", path: string, body: Record<string, unknown>) => {
  const res = await rest(ctx.payload, method, path, { body, headers: signedIn });
  expect(res.status).toBe(200);
};

const createPublishedDoc = async (collection: string) => {
  const doc = (await ctx.payload.create({
    collection: collection as never,
    locale: "en",
    data: { title: "T-en", note: TOUCHED, ...PUBLISHED } as never,
  })) as unknown as { id: string };
  await ctx.payload.update({
    collection: collection as never,
    id: doc.id,
    locale: "de",
    data: { title: "T-de", ...PUBLISHED } as never,
  });
  return doc.id;
};

const publishGlobal = async (slug: string) => {
  await ctx.payload.updateGlobal({
    slug: slug as never,
    locale: "en",
    data: { title: "T-en", note: TOUCHED, ...PUBLISHED } as never,
  });
  await ctx.payload.updateGlobal({
    slug: slug as never,
    locale: "de",
    data: { title: "T-de", ...PUBLISHED } as never,
  });
};

describe("an autosave publish whose afterChange hook saves the same document again", () => {
  const publishAfterGermanAutosave = async (collection: string) => {
    const id = await createPublishedDoc(collection);
    await startOfTheSavesUnderTest();
    await send("PATCH", `/${collection}/${id}?draft=true&autosave=true&locale=de`, {
      title: "T-de2",
    });
    await send("PATCH", `/${collection}/${id}?locale=en`, PUBLISHED);
    return docEventsOfThisTest(collection, id);
  };

  it("lists what the publish wrote in another locale, as without the hook", async () => {
    const plain = await publishAfterGermanAutosave("plain-pages");
    const rewritten = await publishAfterGermanAutosave("rewritten-pages");

    expect(plain).toEqual([["doc.publish", ["title"]]]);
    expect(rewritten).toEqual(plain);
  });

  it("lists what the publish of a global wrote in another locale, as without the hook", async () => {
    const publishGlobalAfterGermanAutosave = async (slug: string) => {
      await publishGlobal(slug);
      await startOfTheSavesUnderTest();
      await send("POST", `/globals/${slug}?draft=true&autosave=true&locale=de`, {
        title: "T-de2",
      });
      await send("POST", `/globals/${slug}?locale=en`, PUBLISHED);
      return globalEventsOfThisTest(slug);
    };
    const plain = await publishGlobalAfterGermanAutosave("plain-settings");
    const rewritten = await publishGlobalAfterGermanAutosave("rewritten-settings");

    expect(plain).toEqual([["global.publish", ["title"]]]);
    expect(rewritten).toEqual(plain);
  });
});

describe("a save that is not a draft save after an autosave", () => {
  it("lists the autosaved field it unpublishes into the document", async () => {
    const id = await createPublishedDoc("plain-pages");
    await startOfTheSavesUnderTest();
    await send("PATCH", `/plain-pages/${id}?draft=true&autosave=true&locale=en`, {
      title: "T-auto",
    });
    await send("PATCH", `/plain-pages/${id}?locale=en`, { note: "n2" });

    expect(await docEventsOfThisTest("plain-pages", id)).toEqual([
      ["doc.unpublish", ["title", "note", "_status"]],
    ]);
  });

  it("lists the autosaved field it unpublishes into a global", async () => {
    await publishGlobal("plain-settings");
    await startOfTheSavesUnderTest();
    await send("POST", "/globals/plain-settings?draft=true&autosave=true&locale=en", {
      title: "T-auto",
    });
    await send("POST", "/globals/plain-settings?locale=en", { note: "n2" });

    expect(await globalEventsOfThisTest("plain-settings")).toEqual([
      ["global.unpublish", ["title", "note", "_status"]],
    ]);
  });
});
