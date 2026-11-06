import { describe, expect, it, vi } from "vitest";
import { withAuditActor } from "../../src/core/actorScope";
import {
  isInAuthOperation,
  markActive,
  markAuthOperation,
  newCreateKey,
  releaseCoverageOfSession,
  unmarkActive,
} from "../../src/core/requestState";
import { wrapDbAdapter } from "../../src/db/wrapDbAdapter";
import type { WrapDbScope } from "../../src/db/wrapDbAdapter";
import { normalizeOptions } from "../../src/options";
import type { ResolvedOptions } from "../../src/options";

type Call = { method: string; args: any };

const badgesInGerman = (secondCaption: string) => ({
  badges: [
    { id: "b1", blockType: "badge", label: "one", caption: "erste" },
    { id: "b2", blockType: "badge", label: "two", caption: secondCaption },
  ],
});

const fakePayloadWithUpsertDelegatingToUpdateOne = (
  overrides: Record<string, (args: any) => Promise<unknown>> = {}
) => {
  const calls: Call[] = [];
  const method =
    (name: string) =>
    async (args: any): Promise<unknown> => {
      calls.push({ method: name, args });
      const override = overrides[name];
      if (override) return override(args);
      return { id: args?.id ?? "new-id" };
    };
  const db: Record<string, unknown> = {
    create: method("create"),
    createGlobal: method("createGlobal"),
    updateOne: method("updateOne"),
    updateMany: method("updateMany"),
    deleteOne: method("deleteOne"),
    deleteMany: method("deleteMany"),
    updateGlobal: method("updateGlobal"),
    createVersion: method("createVersion"),
    updateVersion: method("updateVersion"),
    deleteVersions: method("deleteVersions"),
    createGlobalVersion: method("createGlobalVersion"),
    updateGlobalVersion: method("updateGlobalVersion"),
    find: method("find"),
    findOne: method("findOne"),
    async upsert(this: { updateOne: (a: unknown) => Promise<unknown> }, args: any) {
      calls.push({ method: "upsert", args });
      return this.updateOne({ ...args, options: { upsert: true } });
    },
  };
  const error = vi.fn();
  const payload = {
    db,
    logger: { error },
    collections: {
      users: {
        config: {
          slug: "users",
          auth: { useSessions: true },
          fields: [
            { name: "nickname", type: "text", localized: true },
            {
              name: "profile",
              type: "group",
              fields: [
                { name: "headline", type: "text" },
                { name: "motto", type: "text", localized: true },
                { name: "taxId", type: "text", hidden: true },
              ],
            },
            {
              name: "badges",
              type: "blocks",
              blocks: [
                {
                  slug: "badge",
                  fields: [
                    { name: "label", type: "text" },
                    { name: "caption", type: "text", localized: true },
                  ],
                },
              ],
            },
          ],
          flattenedFields: [
            { name: "email", type: "email" },
            { name: "role", type: "text" },
            { name: "name", type: "text" },
            { name: "nickname", type: "text", localized: true },
            {
              name: "profile",
              type: "group",
              flattenedFields: [
                { name: "headline", type: "text" },
                { name: "motto", type: "text", localized: true },
              ],
            },
            { name: "badges", type: "blocks" },
            { name: "posts", type: "join" },
            { name: "displayName", type: "text", virtual: true },
            { name: "hash", type: "text" },
            { name: "salt", type: "text" },
            { name: "sessions", type: "array" },
            { name: "_verified", type: "checkbox" },
            { name: "_verificationToken", type: "text" },
          ],
        },
      },
      pages: { config: { slug: "pages" } },
    },
  };
  return { payload: payload as never, db: db as any, calls, error };
};

const req = (user: unknown = null, payloadAPI = "local") => ({
  context: {} as Record<string, unknown>,
  user,
  payloadAPI,
  headers: new Headers(),
});

const mongoLikeIncrement = async (args: any) => {
  delete args.data.loginAttempts;
  args.data.updatedAt = "now";
  return { id: args.id };
};

type FakePayload = ReturnType<typeof fakePayloadWithUpsertDelegatingToUpdateOne>;

const CONFIGURED = {
  collections: ["users", "pages", "logs", "audit-events"],
  globals: ["settings", "header", "hidden"],
};

const notExcluded = (slugs: string[], excluded: ReadonlySet<string>) =>
  new Set(slugs.filter((slug) => !excluded.has(slug)));

const auditedScope = (opts: ResolvedOptions): WrapDbScope => ({
  collections: notExcluded(CONFIGURED.collections, opts.excludedCollections),
  globals: notExcluded(CONFIGURED.globals, opts.excludedGlobals),
});

const wrap = (
  f: FakePayload,
  opts: ResolvedOptions = normalizeOptions(),
  scope: WrapDbScope = auditedScope(opts)
) => wrapDbAdapter(f.payload, opts, scope, f.db);

const auditWrites = (calls: Call[]) =>
  calls.filter((c) => c.method === "create" && c.args.collection === "audit-events");

describe("wrapDbAdapter", () => {
  it("logs a direct write outside any Payload operation", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const r = req({ id: 1, collection: "users", email: "u@x.io" });
    await f.db.updateOne({ collection: "pages", id: 5, data: { p: 1, updatedAt: "t" }, req: r });
    const [audit] = auditWrites(f.calls);
    expect(audit?.args.data).toMatchObject({
      action: "system.unattributed_write",
      actor: { type: "user", docId: "1", source: "auth" },
      target: { kind: "collection", slug: "pages", docId: "5" },
      changes: ["p"],
      metadata: { method: "updateOne" },
    });
    expect(audit?.args.req).toBe(r);
  });

  it("does not log writes of the document the current operation works on", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const r = req();
    markActive(r, "pages", "5");
    markActive(r, "pages", newCreateKey());
    await f.db.updateOne({ collection: "pages", id: 5, data: { a: 1 }, req: r });
    await f.db.deleteOne({ collection: "pages", where: { id: { equals: 5 } }, req: r });
    await f.db.create({ collection: "pages", data: { a: 1 }, req: r });
    expect(auditWrites(f.calls)).toHaveLength(0);
  });

  it("logs a raw create once the Payload create of that collection has finished", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const r = req();
    const create = newCreateKey();
    markActive(r, "pages", create);
    await f.db.create({ collection: "pages", data: { a: 1 }, req: r });
    unmarkActive(r, "pages", create);
    await f.db.create({ collection: "pages", data: { b: 1 }, req: r });
    expect(auditWrites(f.calls).map((c) => c.args.data.changes)).toEqual([["b"]]);
  });

  it("covers exactly one insert per running Payload create, so a later raw create in its hooks is logged", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const r = req();
    markActive(r, "pages", newCreateKey());
    markActive(r, "pages", newCreateKey());
    await f.db.create({ collection: "pages", data: { nested: 1 }, req: r });
    await f.db.create({ collection: "pages", data: { outer: 1 }, req: r });
    await f.db.create({ collection: "pages", data: { raw: 1 }, req: r });
    expect(auditWrites(f.calls).map((c) => c.args.data.changes)).toEqual([["raw"]]);
  });

  it("logs raw writes without an id although a document of the collection is active", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const r = req();
    markActive(r, "pages", "5");
    markActive(r, "pages", newCreateKey());
    await f.db.updateMany({
      collection: "pages",
      data: { a: 1 },
      where: { a: { equals: 0 } },
      req: r,
    });
    await f.db.deleteMany({ collection: "pages", where: { a: { equals: 1 } }, req: r });
    expect(auditWrites(f.calls).map((c) => c.args.data.metadata.method)).toEqual([
      "updateMany",
      "deleteMany",
    ]);
  });

  it("logs a write to another document made inside an operation", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const r = req();
    markActive(r, "pages", "5");
    await f.db.updateOne({ collection: "pages", id: 6, data: { x: 1 }, req: r });
    expect(auditWrites(f.calls)).toHaveLength(1);
  });

  it("skips collections outside the audited scope, like the ones Payload adds after plugins run, and user-excluded ones", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f, normalizeOptions({ excludeCollections: ["logs"] }));
    for (const collection of [
      "payload-jobs",
      "payload-preferences",
      "payload-locked-documents",
      "payload-migrations",
      "payload-kv",
      "logs",
    ]) {
      await f.db.updateOne({ collection, id: 1, data: { a: 1 } });
      await f.db.deleteMany({ collection, where: { a: { equals: 1 } } });
    }
    expect(auditWrites(f.calls)).toHaveLength(0);
  });

  it("does not audit writes to the audit collection, so its own insert is not audited again", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    await f.db.create({ collection: "audit-events", data: {} });
    expect(f.calls.filter((c) => c.method === "create")).toHaveLength(1);

    f.calls.length = 0;
    await f.db.updateOne({ collection: "pages", id: 1, data: { a: 1 } });
    expect(f.calls.map((c) => c.method)).toEqual(["updateOne", "create"]);
  });

  it("skips the writes of a Payload auth operation running on the same request", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const loginReq = req();
    markAuthOperation(loginReq, "users");
    const user = { id: 1, email: "u@x.io", role: "editor", updatedAt: null };
    await f.db.updateOne({
      collection: "users",
      id: 1,
      data: { ...user, sessions: [] },
      req: loginReq,
    });
    expect(auditWrites(f.calls)).toHaveLength(0);
    expect(f.calls.map((c) => c.method)).toEqual(["updateOne"]);
  });

  it("ties the coverage an auth operation set before its transaction began to that transaction once it writes in it", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const liveSessions = { "login-tx": {} };
    const loginReq: ReturnType<typeof req> & { transactionID?: unknown; payload: unknown } = {
      ...req(),
      payload: { db: { sessions: liveSessions } },
    };
    markAuthOperation(loginReq, "users");
    loginReq.transactionID = "login-tx";
    await f.db.updateOne({ collection: "users", id: 1, data: { sessions: [] }, req: loginReq });

    releaseCoverageOfSession(liveSessions["login-tx"]);

    expect(isInAuthOperation(loginReq, "users")).toBe(false);
  });

  it("skips writes that only touch auth bookkeeping, with or without req", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const incrementLoginAttempts = {
      collection: "users",
      id: 1,
      data: { loginAttempts: { $inc: 1 }, lockUntil: "later" },
    };
    const rehashPasswordOnLogin = {
      collection: "users",
      data: { hash: "h", salt: "s" },
      where: { id: { equals: 1 }, hash: { equals: "old" } },
    };
    const reserveForgotPassword = {
      collection: "users",
      data: { resetPasswordRequestedAt: null },
      where: {},
      req: req(),
    };
    for (const bookkeeping of [
      incrementLoginAttempts,
      rehashPasswordOnLogin,
      reserveForgotPassword,
    ]) {
      await f.db.updateOne(bookkeeping);
    }
    expect(auditWrites(f.calls)).toHaveLength(0);
  });

  it("logs a raw write of the whole stored user with a changed role, listing only what changed", async () => {
    const stored = { id: 1, email: "u@x.io", role: "editor", hash: "h", salt: "s", sessions: [] };
    const f = fakePayloadWithUpsertDelegatingToUpdateOne({ findOne: async () => ({ ...stored }) });
    wrap(f);
    await f.db.updateOne({ collection: "users", id: 1, data: { ...stored, role: "admin" } });
    const [audit] = auditWrites(f.calls);
    expect(audit?.args.data).toMatchObject({
      action: "system.unattributed_write",
      target: { kind: "collection", slug: "users", docId: "1" },
      changes: ["role"],
    });
    expect(f.calls.find((c) => c.method === "findOne")?.args).toMatchObject({
      collection: "users",
      where: { id: { equals: 1 } },
    });
  });

  describe("localized fields of a raw auth write", () => {
    const stored = {
      id: 1,
      email: "u@x.io",
      nickname: { en: "english", de: "deutsch" },
      profile: { headline: "h", motto: { en: "hello", de: "hallo" } },
      badges: [
        { id: "b1", blockType: "badge", label: "one", caption: { en: "first", de: "erste" } },
        { id: "b2", blockType: "badge", label: "two", caption: { en: "second", de: "zweite" } },
      ],
      sessions: [],
    };
    const writeBack = async (
      data: Record<string, unknown>,
      locale?: string,
      writeArgs: Record<string, unknown> = {}
    ) => {
      const f = fakePayloadWithUpsertDelegatingToUpdateOne({
        findOne: async () => ({ ...stored }),
      });
      (f.payload as unknown as { config: unknown }).config = {
        localization: { defaultLocale: "en", localeCodes: ["en", "de"] },
      };
      wrap(f);
      await f.db.updateOne({
        collection: "users",
        id: 1,
        data: { email: "u@x.io", sessions: [{ id: "s" }], ...data },
        req: locale ? { ...req(), locale } : req(),
        ...writeArgs,
      });
      return auditWrites(f.calls).map((call) => call.args.data.changes);
    };

    it("compares a value read in the request's locale with the stored value in that locale", async () => {
      expect(
        await writeBack({ nickname: "deutsch", profile: { headline: "h", motto: "hallo" } }, "de")
      ).toEqual([]);
    });

    it("compares a value written without a request locale with the stored value in the default locale", async () => {
      expect(
        await writeBack({ nickname: "english", profile: { headline: "h", motto: "hello" } })
      ).toEqual([]);
    });

    it("reports a localized value that differs from the stored value in the request's locale", async () => {
      expect(
        await writeBack({ nickname: "geändert", profile: { headline: "h", motto: "hallo" } }, "de")
      ).toEqual([["nickname"]]);
      expect(
        await writeBack({ nickname: "deutsch", profile: { headline: "h", motto: "servus" } }, "de")
      ).toEqual([["profile.motto"]]);
    });

    it("compares a value written with an explicit locale with the stored value in that locale, over the request's locale", async () => {
      const germanValues = { nickname: "deutsch", profile: { headline: "h", motto: "hallo" } };
      expect(await writeBack(germanValues, "en", { locale: "de" })).toEqual([]);
      expect(await writeBack(germanValues, "de", { locale: "en" })).toEqual([
        ["nickname", "profile.motto"],
      ]);
    });

    it("compares a localized value inside rows with the stored value in the locale of the write, matching rows by id", async () => {
      expect(await writeBack(badgesInGerman("zweite"), "de")).toEqual([]);
      expect(await writeBack(badgesInGerman("geändert"), "de")).toEqual([["badges.1.caption"]]);
    });

    it("compares a value written for every locale with every stored locale", async () => {
      expect(await writeBack({ nickname: { en: "english", de: "anders" } }, "de")).toEqual([
        ["nickname.de"],
      ]);
    });
  });

  it("compares only stored fields, so a user read through the Local API and given a session is not reported", async () => {
    const stored = { id: 1, email: "u@x.io", role: "editor", hash: "h", sessions: [] };
    const f = fakePayloadWithUpsertDelegatingToUpdateOne({ findOne: async () => ({ ...stored }) });
    wrap(f);
    const readThroughLocalApi = {
      id: 1,
      email: "u@x.io",
      role: "editor",
      posts: { docs: [3] },
      displayName: "U",
      collection: "users",
      _strategy: "local-jwt",
    };
    await f.db.updateOne({
      collection: "users",
      id: 1,
      data: { ...readThroughLocalApi, sessions: [{ id: "s" }], updatedAt: null },
      req: req(),
    });
    expect(auditWrites(f.calls)).toHaveLength(0);
  });

  const giveSessionToUserReadThroughLocalApi = async (
    stored: Record<string, unknown>,
    readThroughLocalApi: Record<string, unknown>
  ) => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne({ findOne: async () => ({ ...stored }) });
    wrap(f);
    await f.db.updateOne({
      collection: "users",
      id: 1,
      data: { ...readThroughLocalApi, sessions: [{ id: "s" }] },
      req: req(),
    });
    return auditWrites(f.calls);
  };

  it("treats a field stored as null and the same field missing from the written user alike", async () => {
    const audits = await giveSessionToUserReadThroughLocalApi(
      { id: 1, email: "u@x.io", name: null, profile: { headline: null, taxId: null } },
      { id: 1, email: "u@x.io", profile: {} }
    );
    expect(audits).toHaveLength(0);
  });

  it("treats empty blocks written as an empty array and missing from the stored user alike", async () => {
    const audits = await giveSessionToUserReadThroughLocalApi(
      { id: 1, email: "u@x.io" },
      { id: 1, email: "u@x.io", badges: [], profile: { headline: null } }
    );
    expect(audits).toHaveLength(0);
  });

  it("does not report a nested hidden field the Local API read left out of the written user", async () => {
    const audits = await giveSessionToUserReadThroughLocalApi(
      { id: 1, email: "u@x.io", profile: { headline: "h", taxId: "tax-1" } },
      { id: 1, email: "u@x.io", profile: { headline: "h" } }
    );
    expect(audits).toHaveLength(0);
  });

  it("still reports nested and blocks changes in a user read through the Local API", async () => {
    const [audit] = await giveSessionToUserReadThroughLocalApi(
      { id: 1, email: "u@x.io", profile: { headline: "h", taxId: "tax-1" } },
      {
        id: 1,
        email: "u@x.io",
        profile: { headline: "h2" },
        badges: [{ blockType: "badge", label: "new" }],
      }
    );
    expect(audit?.args.data.changes).toEqual(["profile.headline", "badges"]);
  });

  it("skips email verification, which runs no hooks and changes only bookkeeping", async () => {
    const stored = {
      id: 1,
      email: "u@x.io",
      role: "editor",
      _verified: false,
      _verificationToken: "t",
    };
    const f = fakePayloadWithUpsertDelegatingToUpdateOne({ findOne: async () => ({ ...stored }) });
    wrap(f);
    await f.db.updateOne({
      collection: "users",
      id: 1,
      data: { ...stored, updatedAt: "now", _verificationToken: null, _verified: true },
      req: req(),
    });
    expect(auditWrites(f.calls)).toHaveLength(0);
  });

  it("does not read the stored user when an operation on that user already covers the write", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const updateReq = req();
    markActive(updateReq, "users", "1");
    await f.db.updateOne({
      collection: "users",
      id: 1,
      data: { email: "u@x.io", role: "admin", hash: "h", salt: "s" },
      req: updateReq,
    });
    expect(f.calls.map((c) => c.method)).toEqual(["updateOne"]);
  });

  it("logs every submitted data field when the stored user cannot be read", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne({
      findOne: async () => {
        throw new Error("read failed");
      },
    });
    wrap(f);
    await f.db.updateOne({
      collection: "users",
      id: 1,
      data: { role: "admin", name: "n", sessions: [], updatedAt: "now" },
    });
    expect(auditWrites(f.calls)[0]?.args.data.changes).toEqual(["role", "name"]);
    expect(f.error).toHaveBeenCalled();
  });

  it("an auth operation on another collection does not hide a raw write", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const memberLoginReq = req();
    markAuthOperation(memberLoginReq, "members");
    await f.db.updateOne({
      collection: "users",
      id: 1,
      data: { role: "admin" },
      req: memberLoginReq,
    });
    expect(auditWrites(f.calls)).toHaveLength(1);
  });

  it("judges a write by the data it was given, although the adapter rewrites that object in place", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne({ updateOne: mongoLikeIncrement });
    wrap(f);
    await f.db.updateOne({ collection: "users", id: 1, data: { loginAttempts: { $inc: 1 } } });
    expect(auditWrites(f.calls)).toHaveLength(0);
  });

  it("treats auth fields as ordinary data outside auth collections", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    await f.db.updateOne({ collection: "pages", id: 1, data: { sessions: [] } });
    expect(auditWrites(f.calls)).toHaveLength(1);
  });

  it("logs an upsert once, not again for the updateOne it delegates to", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    await f.db.upsert({
      collection: "pages",
      data: { slug: "a" },
      where: { slug: { equals: "a" } },
    });
    const audits = auditWrites(f.calls);
    expect(audits).toHaveLength(1);
    expect(audits[0]?.args.data.metadata).toEqual({ method: "upsert", where: ["slug"] });
  });

  it("summarises where without reading: field paths only, id from the result", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne({ updateOne: async () => ({ id: 42 }) });
    wrap(f);
    await f.db.updateOne({
      collection: "pages",
      data: { title: "x" },
      where: {
        and: [{ slug: { equals: "secret-value" } }, { or: [{ "meta.a": { exists: true } }] }],
      },
    });
    const [audit] = auditWrites(f.calls);
    expect(audit?.args.data.target).toEqual({ kind: "collection", slug: "pages", docId: "42" });
    expect(audit?.args.data.metadata).toEqual({ method: "updateOne", where: ["slug", "meta.a"] });
    expect(JSON.stringify(audit?.args.data)).not.toContain("secret-value");
    expect(f.calls.filter((c) => c.method.startsWith("find"))).toHaveLength(0);
  });

  it("logs bulk methods without an id", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne({
      updateMany: async () => [{ id: 1 }, { id: 2 }],
    });
    wrap(f);
    await f.db.updateMany({ collection: "pages", data: { a: 1 }, where: { a: { equals: 0 } } });
    await f.db.deleteMany({ collection: "pages", where: { a: { equals: 1 } } });
    const audits = auditWrites(f.calls).map((c) => c.args.data);
    expect(audits.map((e) => [e.action, e.target, e.metadata])).toEqual([
      [
        "system.unattributed_write",
        { kind: "collection", slug: "pages" },
        { method: "updateMany", where: ["a"] },
      ],
      [
        "system.unattributed_write",
        { kind: "collection", slug: "pages" },
        { method: "deleteMany", where: ["a"] },
      ],
    ]);
    expect(audits[1]?.changes).toBeUndefined();
  });

  it("covers audited globals and skips the active one and Payload's job stats global", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f, normalizeOptions({ excludeGlobals: ["hidden"] }));
    await f.db.updateGlobal({ slug: "settings", data: { a: 1 } });
    await f.db.createGlobal({ slug: "header", data: { b: 1 } });
    const r = req();
    markActive(r, "global", "settings");
    await f.db.updateGlobal({ slug: "settings", data: { a: 2 }, req: r });
    await f.db.updateGlobal({ slug: "payload-jobs-stats", data: { stats: {} } });
    await f.db.updateGlobal({ slug: "hidden", data: { a: 1 } });
    const audits = auditWrites(f.calls).map((c) => c.args.data);
    expect(audits.map((e) => [e.target, e.metadata])).toEqual([
      [{ kind: "global", slug: "settings" }, { method: "updateGlobal" }],
      [{ kind: "global", slug: "header" }, { method: "createGlobal" }],
    ]);
  });

  it("takes the actor from withAuditActor when the call has no req (seeds)", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    await withAuditActor({ type: "seed", label: "seed:demo" }, () =>
      f.db.updateOne({ collection: "pages", id: 1, data: { a: 1 } })
    );
    await f.db.updateOne({ collection: "pages", id: 2, data: { a: 1 } });
    const [seeded, bare] = auditWrites(f.calls).map((c) => c.args.data);
    expect(seeded.actor).toEqual({ type: "seed", label: "seed:demo", source: "als" });
    expect(bare.actor).toEqual({ type: "system", source: "inferred" });
    expect(bare.via).toBe("local");
    expect(auditWrites(f.calls)[0]?.args.req).toBeUndefined();
  });

  it("only tracks the collections and globals it is told to", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f, normalizeOptions(), {
      collections: new Set(["pages"]),
      globals: new Set(["settings"]),
    });
    await f.db.updateOne({ collection: "plugin-added", id: 1, data: { a: 1 } });
    await f.db.updateGlobal({ slug: "plugin-global", data: { a: 1 } });
    expect(auditWrites(f.calls)).toHaveLength(0);
    await f.db.updateOne({ collection: "pages", id: 1, data: { a: 1 } });
    await f.db.updateGlobal({ slug: "settings", data: { a: 1 } });
    expect(auditWrites(f.calls)).toHaveLength(2);
  });

  it("wraps only write methods and leaves reads and versions untouched", () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    const before = { ...f.db };
    wrap(f);
    for (const m of ["find", "findOne", "createVersion", "updateVersion", "deleteVersions"]) {
      expect(f.db[m]).toBe(before[m]);
    }
    for (const m of ["create", "updateOne", "updateMany", "deleteOne", "deleteMany", "upsert"]) {
      expect(f.db[m]).not.toBe(before[m]);
    }
  });

  it("is idempotent", () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const once = f.db.updateOne;
    wrap(f);
    expect(f.db.updateOne).toBe(once);
  });

  it("does nothing when trackUnattributedWrites is false", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    const original = f.db.updateOne;
    wrap(f, normalizeOptions({ trackUnattributedWrites: false }));
    expect(f.db.updateOne).toBe(original);
  });

  it("passes the original error through and logs nothing", async () => {
    const boom = new Error("unique violation");
    const f = fakePayloadWithUpsertDelegatingToUpdateOne({
      updateOne: async () => {
        throw boom;
      },
    });
    wrap(f);
    await expect(f.db.updateOne({ collection: "pages", id: 1, data: { a: 1 } })).rejects.toBe(boom);
    expect(auditWrites(f.calls)).toHaveLength(0);
  });

  it("returns the original result even when the audit insert fails", async () => {
    const result = { id: 1, a: 1 };
    const f = fakePayloadWithUpsertDelegatingToUpdateOne({
      updateOne: async () => result,
      create: async (args) => {
        if (args.collection === "audit-events") throw new Error("audit table missing");
        return {};
      },
    });
    wrap(f);
    await expect(f.db.updateOne({ collection: "pages", id: 1, data: { a: 1 } })).resolves.toBe(
      result
    );
    expect(f.error).toHaveBeenCalled();
  });

  it("never fails the raw write when inspecting it throws", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    Object.defineProperty(f.payload, "collections", {
      get() {
        throw new Error("collections unavailable");
      },
    });
    wrap(f);
    await expect(
      f.db.updateOne({ collection: "users", id: 1, data: { role: "x", sessions: [] } })
    ).resolves.toEqual({ id: 1 });
    expect(f.calls.map((c) => c.method)).toContain("updateOne");
    expect(f.error).toHaveBeenCalled();
  });

  it("returns the original result when building the event throws", async () => {
    const f = fakePayloadWithUpsertDelegatingToUpdateOne();
    wrap(f);
    const badReq = req();
    Object.defineProperty(badReq, "headers", {
      get() {
        throw new Error("broken req");
      },
    });
    badReq.payloadAPI = "REST";
    await expect(
      f.db.updateOne({ collection: "pages", id: 1, data: { a: 1 }, req: badReq })
    ).resolves.toEqual({ id: 1 });
    expect(f.error).toHaveBeenCalled();
  });

  it("reads the stored user inside a savepoint of the request's SQL transaction and falls back when the read fails", async () => {
    const stored = { id: 1, email: "u@x.io", role: "editor", hash: "h", sessions: [] };
    const statements: string[] = [];
    const f = fakePayloadWithUpsertDelegatingToUpdateOne({
      findOne: async () => {
        statements.push("READ");
        throw new Error("permission denied for table users");
      },
    });
    const tx = { name: "tx" };
    f.db.sessions = { "tx-1": { db: tx } };
    f.db.execute = vi.fn(async ({ raw }: { raw: string }) => {
      statements.push(raw.split(" audit_")[0] as string);
    });
    wrap(f);
    const inTransaction = { ...req(), transactionID: "tx-1" };
    await f.db.updateOne({
      collection: "users",
      id: 1,
      data: { ...stored, role: "admin", sessions: [{ id: "s" }] },
      req: inTransaction,
    });
    expect(statements.slice(0, 4)).toEqual([
      "SAVEPOINT",
      "READ",
      "ROLLBACK TO SAVEPOINT",
      "RELEASE SAVEPOINT",
    ]);
    expect(f.error.mock.calls[0]?.[0]).toMatchObject({
      msg: "[payload-plugin-audit-log] could not read the stored document to compare a raw auth write",
    });
    const [audit] = auditWrites(f.calls);
    expect(audit?.args.data.changes).toEqual(["email", "role"]);
  });
});
