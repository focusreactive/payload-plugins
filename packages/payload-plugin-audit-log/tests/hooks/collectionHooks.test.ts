import type { CollectionConfig } from "payload";
import { describe, expect, it, vi } from "vitest";
import { captureWrittenDoc } from "../../src/core/writtenDocCapture";
import { withCollectionAudit } from "../../src/hooks/collectionHooks";
import { normalizeOptions } from "../../src/options";
import {
  fakeRequest,
  recordedActions,
  recordedEvents,
  runBeforeOperation,
  runHooks,
} from "../helpers/fakeRequest";

type Doc = Record<string, unknown>;
type FakeRequest = ReturnType<typeof fakeRequest>["req"];
type Hooks = CollectionConfig["hooks"];

const audited = (collection: CollectionConfig, options = {}) =>
  withCollectionAudit(collection, normalizeOptions(options));

const posts = audited({ slug: "posts", admin: { useAsTitle: "title" }, fields: [] });
const autosavedPosts = audited({
  slug: "posts",
  admin: { useAsTitle: "title" },
  versions: { drafts: { autosave: true } },
  fields: [],
});
const users = audited({ slug: "users", auth: true, fields: [{ name: "role", type: "text" }] });
const postsCollection = { slug: "posts", admin: { useAsTitle: "title" } };
const usersCollection = { slug: "users" };

const firstEvent = (create: ReturnType<typeof fakeRequest>["create"]) => recordedEvents(create)[0];

const callHook = (hook: unknown, args: unknown) => (hook as (a: unknown) => unknown)(args);

const runBeforeChange = async (hooks: Hooks, args: Record<string, unknown> & { data: Doc }) => {
  let data = args.data;
  for (const hook of hooks?.beforeChange ?? []) {
    const returned = await (hook as (hookArgs: unknown) => unknown)({ ...args, data });
    data = (returned as Doc | undefined) ?? data;
  }
  return data;
};

const withLaterHookCopyingData = (collection: CollectionConfig): CollectionConfig => ({
  ...collection,
  hooks: {
    ...collection.hooks,
    beforeChange: [
      ...(collection.hooks?.beforeChange ?? []),
      ({ data }: { data: Doc }) => ({ ...data }),
    ],
  },
});

const runUpdate = (
  hooks: Hooks,
  req: FakeRequest,
  change: {
    previousDoc: Doc;
    doc: Doc;
    data?: Doc;
    collection?: unknown;
    overrideAccess?: boolean;
  }
) =>
  runHooks(hooks?.afterChange, {
    operation: "update",
    collection: postsCollection,
    ...change,
    req,
  });

const runCreate = async (
  hooks: Hooks,
  req: FakeRequest,
  create: {
    doc: Doc;
    data?: Doc;
    duplicateFromID?: unknown;
    duplicatedFromDoc?: Doc;
    whileSaving?: () => Promise<void>;
    uploadReplacesData?: boolean;
  }
) => {
  const args = { data: create.data ?? {}, duplicateFromID: create.duplicateFromID };
  await runHooks(hooks?.beforeOperation, {
    operation: "create",
    args,
    req,
    collection: postsCollection,
  });
  const data = await runBeforeChange(hooks, {
    operation: "create",
    originalDoc: create.duplicatedFromDoc ?? {},
    data: create.uploadReplacesData ? { ...args.data } : args.data,
    req,
    collection: postsCollection,
  });
  await create.whileSaving?.();
  await runHooks(hooks?.afterChange, {
    operation: "create",
    data,
    previousDoc: {},
    doc: create.doc,
    req,
    collection: postsCollection,
  });
};

const draftSave = (id: number) => ({
  previousDoc: { id, title: "A", _status: "published" },
  doc: { id, title: "B", _status: "draft" },
  data: { title: "B", _status: "draft" },
});

const noteSave = (id: number) => ({
  previousDoc: { id, note: "a", _status: "published" },
  doc: { id, note: "b", _status: "published" },
  data: { note: "b" },
});

const richText = (children: unknown[]) => ({ root: { type: "root", children } });

const sanitizedCollection = (slug: string, ...storedFieldNames: string[]) => ({
  slug,
  flattenedFields: [
    ...storedFieldNames.map((name) => ({ name, type: "text" })),
    { name: "notes", type: "join" },
    { name: "titleUpper", type: "text", virtual: true },
  ],
});

describe("collection hooks", () => {
  describe("failing open", () => {
    const throwingToJSON = {
      toJSON() {
        throw new Error("toJSON failed");
      },
    };

    it("never fails a save whose documents cannot be compared, and logs why", async () => {
      const { req, create, error } = fakeRequest();
      const doc = { id: 1, count: 2n };
      const afterChange = posts.hooks?.afterChange?.at(-1);
      await expect(
        callHook(afterChange, {
          operation: "update",
          previousDoc: { id: 1, count: 1n },
          doc,
          req,
          collection: postsCollection,
        })
      ).resolves.toBe(doc);
      await expect(
        callHook(afterChange, {
          operation: "update",
          previousDoc: { id: 1, meta: "x" },
          doc: { id: 1, meta: throwingToJSON },
          req,
          collection: postsCollection,
        })
      ).resolves.toMatchObject({ id: 1 });
      expect(create).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledTimes(2);
      expect(error.mock.calls[0]?.[0]).toMatchObject({
        msg: expect.stringContaining("[payload-plugin-audit-log]"),
      });
    });

    it("never fails a save, delete or login when the event cannot be built", async () => {
      const { req, create, error } = fakeRequest();
      const unreadable = {
        id: 9,
        get email(): string {
          throw new Error("unreadable");
        },
      };
      const brokenReq = Object.defineProperty({ ...req }, "headers", {
        get() {
          throw new Error("broken req");
        },
      });
      brokenReq.payloadAPI = "REST";
      await expect(
        callHook(users.hooks?.afterLogin?.at(-1), { user: unreadable, req, token: "t" })
      ).resolves.toBe(unreadable);
      const doc = { id: 1, title: "x" };
      await expect(
        callHook(posts.hooks?.afterDelete?.at(-1), { id: 1, doc, req: brokenReq })
      ).resolves.toBe(doc);
      expect(create).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledTimes(2);
    });
  });

  it("does not report virtual and join fields, which a stored version never has", async () => {
    const pages = audited({
      slug: "pages",
      fields: [
        { name: "title", type: "text" },
        { name: "titleUpper", type: "text", virtual: true },
        { name: "notes", type: "join", collection: "comments", on: "page" },
        { type: "row", fields: [{ name: "computed", type: "text", virtual: true }] },
      ],
    });
    const updated = fakeRequest();
    await runUpdate(pages.hooks, updated.req, {
      previousDoc: { id: 1, title: "a" },
      doc: { id: 1, title: "b", titleUpper: "B", computed: "x", notes: { docs: [] } },
    });
    expect(firstEvent(updated.create)?.changes).toEqual(["title"]);

    const created = fakeRequest();
    await runHooks(pages.hooks?.afterChange, {
      operation: "create",
      previousDoc: {},
      doc: { id: 2, title: "b", titleUpper: "B", notes: { docs: [] } },
      req: created.req,
      collection: postsCollection,
    });
    expect(firstEvent(created.create)?.changes).toEqual(["title"]);
  });

  it("records an unpublish when the latest version is a draft but the main doc was published", async () => {
    const drafts = audited({
      slug: "posts",
      versions: { drafts: true },
      fields: [{ name: "title", type: "text" }],
    });
    const caller = fakeRequest();
    const { db, create } = caller;
    const findOne = vi.fn().mockResolvedValue({ id: 7, _status: "published" });
    db.findOne = findOne;
    const latestDraftVersion = { id: 7, title: "P2", _status: "draft" };
    const req = await runBeforeOperation(drafts.hooks?.beforeOperation, {
      operation: "update",
      args: { id: 7, data: { _status: "draft" } },
      req: caller.req,
      collection: postsCollection,
    });
    await runHooks(drafts.hooks?.beforeChange, {
      operation: "update",
      originalDoc: latestDraftVersion,
      data: { _status: "draft" },
      req,
      collection: postsCollection,
    });
    await runUpdate(drafts.hooks, req, {
      previousDoc: latestDraftVersion,
      doc: { ...latestDraftVersion },
    });
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(recordedActions(create)).toEqual(["doc.unpublish"]);
  });

  it("lists what an unpublish changes in the live document, including what the draft it promotes changed", async () => {
    for (const versions of [{ drafts: true }, { drafts: { autosave: true } }]) {
      const drafts = audited({
        slug: "posts",
        versions,
        fields: [
          { name: "title", type: "text" },
          { name: "note", type: "text" },
        ],
      });
      const caller = fakeRequest();
      const { db, create } = caller;
      db.findOne = vi
        .fn()
        .mockResolvedValue({ id: 7, title: "T", note: "n", _status: "published" });
      const latestDraftVersion = { id: 7, title: "T-auto", note: "n", _status: "draft" };
      const data = { note: "n2", _status: "draft" };
      const req = await runBeforeOperation(drafts.hooks?.beforeOperation, {
        operation: "update",
        args: { id: 7, data: { note: "n2" } },
        req: caller.req,
        collection: postsCollection,
      });
      await runHooks(drafts.hooks?.beforeChange, {
        operation: "update",
        originalDoc: latestDraftVersion,
        data,
        req,
        collection: postsCollection,
      });
      await runUpdate(drafts.hooks, req, {
        previousDoc: latestDraftVersion,
        doc: { ...latestDraftVersion, note: "n2" },
        data,
      });
      expect(recordedEvents(create).map((event) => [event.action, event.changes])).toEqual([
        ["doc.unpublish", ["title", "note", "_status"]],
      ]);
    }
  });

  it("reads whether the main document is published inside a savepoint of the SQL transaction", async () => {
    const drafts = audited({ slug: "posts", versions: { drafts: true }, fields: [] });
    const caller = fakeRequest({ transactionID: "tx-1" });
    const { db, create, error } = caller;
    const statements: string[] = [];
    db.findOne = vi.fn(async () => {
      statements.push("READ");
      throw new Error("permission denied for table posts");
    });
    db.sessions = { "tx-1": { db: { name: "tx" } } };
    db.execute = vi.fn(async ({ raw }: { raw: string }) => {
      statements.push(raw.split(" audit_")[0] as string);
    });
    const latestDraftVersion = { id: 7, title: "P2", _status: "draft" };
    const req = await runBeforeOperation(drafts.hooks?.beforeOperation, {
      operation: "update",
      args: { id: 7, data: { _status: "draft" } },
      req: caller.req,
      collection: postsCollection,
    });
    await runHooks(drafts.hooks?.beforeChange, {
      operation: "update",
      originalDoc: latestDraftVersion,
      data: { _status: "draft" },
      req,
      collection: postsCollection,
    });
    expect(statements).toEqual(["SAVEPOINT", "READ", "ROLLBACK TO SAVEPOINT", "RELEASE SAVEPOINT"]);
    expect(error.mock.calls[0]?.[0]).toMatchObject({
      msg: "[payload-plugin-audit-log] reading the published document failed",
    });
    await runUpdate(drafts.hooks, req, {
      previousDoc: latestDraftVersion,
      doc: { ...latestDraftVersion, title: "P3" },
    });
    expect(recordedActions(create)).toEqual(["doc.update"]);
  });

  it("records overrideAccess false when the operation did not override access", async () => {
    const { req, create } = fakeRequest();
    await runUpdate(posts.hooks, req, {
      previousDoc: { id: 7, title: "A" },
      doc: { id: 7, title: "B" },
      overrideAccess: undefined,
    });
    expect(firstEvent(create)?.overrideAccess).toBe(false);
  });

  it("writes doc.update with changed paths and label", async () => {
    const { req, create } = fakeRequest();
    await runUpdate(posts.hooks, req, {
      previousDoc: { id: 7, title: "A" },
      doc: { id: 7, title: "B" },
      overrideAccess: true,
    });
    expect(firstEvent(create)).toMatchObject({
      action: "doc.update",
      target: { kind: "collection", slug: "posts", docId: "7", label: "B" },
      changes: ["title"],
      overrideAccess: true,
    });
  });

  it("skips no-op saves and autosave ticks", async () => {
    const noOp = fakeRequest();
    await runUpdate(posts.hooks, noOp.req, {
      previousDoc: { id: 1, title: "A" },
      doc: { id: 1, title: "A" },
    });
    expect(noOp.create).not.toHaveBeenCalled();

    const autosave = fakeRequest();
    const autosaveReq = await runBeforeOperation(autosavedPosts.hooks?.beforeOperation, {
      operation: "update",
      args: { id: 1, autosave: true, draft: true, data: { title: "B" } },
      req: autosave.req,
      collection: postsCollection,
    });
    await runUpdate(autosavedPosts.hooks, autosaveReq, {
      previousDoc: { id: 1, title: "A" },
      doc: { id: 1, title: "B" },
    });
    expect(autosave.create).not.toHaveBeenCalled();
  });

  describe("the autosave argument", () => {
    const usersWithRoles = audited({
      slug: "users",
      auth: true,
      fields: [{ name: "role", type: "text" }],
    });

    const runSave = async (
      hooks: Hooks,
      operation: "create" | "update",
      args: Doc,
      change: { previousDoc: Doc; doc: Doc }
    ) => {
      const caller = fakeRequest();
      const req = await runBeforeOperation(hooks?.beforeOperation, {
        operation,
        args,
        req: caller.req,
        collection: postsCollection,
      });
      const data = await runBeforeChange(hooks, {
        operation,
        originalDoc: change.previousDoc,
        data: (args.data as Doc | undefined) ?? {},
        req,
        collection: postsCollection,
      });
      await runHooks(hooks?.afterChange, {
        operation,
        data,
        ...change,
        req,
        collection: postsCollection,
      });
      return caller.create;
    };

    it("logs an update with autosave in a collection without drafts, with its role change among the changes", async () => {
      const create = await runSave(
        usersWithRoles.hooks,
        "update",
        { id: 1, autosave: true, data: { role: "admin" } },
        { previousDoc: { id: 1, role: "editor" }, doc: { id: 1, role: "admin" } }
      );
      expect(recordedEvents(create).map((event) => [event.action, event.changes])).toEqual([
        ["doc.update", ["role"]],
      ]);
    });

    it("logs a create with autosave and draft, since Payload always writes a created document", async () => {
      const create = await runSave(
        autosavedPosts.hooks,
        "create",
        { autosave: true, draft: true, data: { title: "A" } },
        { previousDoc: {}, doc: { id: 1, title: "A", _status: "draft" } }
      );
      expect(recordedActions(create)).toEqual(["doc.create"]);
    });

    it("logs a publish submitted with autosave and draft", async () => {
      const create = await runSave(
        autosavedPosts.hooks,
        "update",
        { id: 1, autosave: true, draft: true, data: { title: "B", _status: "published" } },
        {
          previousDoc: { id: 1, title: "A", _status: "draft" },
          doc: { id: 1, title: "B", _status: "published" },
        }
      );
      expect(recordedActions(create)).toEqual(["doc.publish"]);
    });

    it("logs an update with autosave but without draft", async () => {
      const create = await runSave(
        autosavedPosts.hooks,
        "update",
        { id: 1, autosave: true, data: { title: "B" } },
        { previousDoc: { id: 1, title: "A" }, doc: { id: 1, title: "B" } }
      );
      expect(recordedActions(create)).toEqual(["doc.update"]);
    });

    it("logs a draft save sent with autosave to a collection whose drafts have no autosave", async () => {
      const draftPosts = audited({ slug: "posts", versions: { drafts: true }, fields: [] });
      const create = await runSave(
        draftPosts.hooks,
        "update",
        { id: 1, autosave: true, draft: true, data: { title: "B" } },
        {
          previousDoc: { id: 1, title: "A", _status: "published" },
          doc: { id: 1, title: "B", _status: "draft" },
        }
      );
      expect(recordedEvents(create).map((event) => [event.action, event.changes])).toEqual([
        ["doc.update", ["title", "_status"]],
      ]);
    });

    it("skips an autosave draft tick", async () => {
      const create = await runSave(
        autosavedPosts.hooks,
        "update",
        { id: 1, autosave: true, draft: true, data: { title: "B", _status: "draft" } },
        {
          previousDoc: { id: 1, title: "A", _status: "draft" },
          doc: { id: 1, title: "B", _status: "draft" },
        }
      );
      expect(create).not.toHaveBeenCalled();
    });
  });

  it("records a duplicate as doc.create of the copy, without metadata", async () => {
    const { req, create } = fakeRequest();
    await runCreate(withLaterHookCopyingData(posts).hooks, req, {
      duplicateFromID: 3,
      duplicatedFromDoc: { title: "Orig" },
      data: { title: "Copy" },
      doc: { id: 4, title: "Copy" },
    });
    expect(recordedEvents(create)).toEqual([
      expect.objectContaining({
        action: "doc.create",
        target: expect.objectContaining({ docId: "4", label: "Copy" }),
        changes: ["title"],
      }),
    ]);
    expect(firstEvent(create)).not.toHaveProperty("metadata");
  });

  it("keeps a plain create as doc.create although field hooks add empty groups to originalDoc", async () => {
    const plain = fakeRequest();
    await runCreate(posts.hooks, plain.req, {
      duplicatedFromDoc: { seo: {} },
      doc: { id: 4, title: "New" },
    });
    expect(recordedActions(plain.create)).toEqual(["doc.create"]);

    const upload = fakeRequest();
    await runCreate(posts.hooks, upload.req, {
      duplicatedFromDoc: { seo: {}, list: [] },
      doc: { id: 5, title: "Upload" },
      uploadReplacesData: true,
    });
    expect(recordedActions(upload.create)).toEqual(["doc.create"]);
  });

  it("does not let nested operations on one req clobber the outer operation's flags", async () => {
    const { req, create } = fakeRequest();
    const published = { _status: "published" };
    const draft = { _status: "draft" };

    await runCreate(posts.hooks, req, {
      duplicateFromID: 3,
      duplicatedFromDoc: { title: "Orig" },
      doc: { id: 4, title: "Copy" },
      whileSaving: async () => {
        const draftSaveReq = await runBeforeOperation(posts.hooks?.beforeOperation, {
          operation: "update",
          args: { id: 7, draft: true },
          req,
          collection: postsCollection,
        });

        await runCreate(posts.hooks, draftSaveReq, { doc: { id: 5, title: "Nested" } });
        const nestedSaveReq = await runBeforeOperation(posts.hooks?.beforeOperation, {
          operation: "update",
          args: { id: 8 },
          req: draftSaveReq,
          collection: postsCollection,
        });
        await runUpdate(posts.hooks, nestedSaveReq, {
          previousDoc: { id: 8, ...published },
          doc: { id: 8, ...draft },
        });

        await runUpdate(posts.hooks, draftSaveReq, {
          previousDoc: { id: 7, ...published },
          doc: { id: 7, ...draft },
        });
      },
    });

    expect(recordedActions(create)).toEqual([
      "doc.create",
      "doc.unpublish",
      "doc.update",
      "doc.create",
    ]);
  });

  it("runs its beforeChange after project hooks and returns the same data object", async () => {
    const own = vi.fn((args: { data: unknown }) => args.data);
    const collection = audited({ slug: "x", fields: [], hooks: { beforeChange: [own] } });
    expect(collection.hooks?.beforeChange?.[0]).toBe(own);
    const auditBeforeChange = collection.hooks?.beforeChange?.[1] as (args: unknown) => unknown;
    const data = { a: 1 };
    const { req } = fakeRequest();
    expect(await auditBeforeChange({ operation: "create", originalDoc: {}, data, req })).toBe(data);
  });

  it("records restoreVersion on the parent document, not on the version id", async () => {
    const { req, create } = fakeRequest();
    await runHooks(posts.hooks?.beforeOperation, {
      operation: "restoreVersion",
      args: { id: "v1" },
      req,
      collection: postsCollection,
    });
    req.context.isRestoringVersion = true;
    await runHooks(posts.hooks?.beforeChange, {
      operation: "update",
      originalDoc: { id: 7, title: "B" },
      data: { title: "A" },
      req,
      collection: postsCollection,
    });
    await runUpdate(posts.hooks, req, {
      previousDoc: { id: 7, title: "B" },
      doc: { id: 7, title: "A" },
    });
    expect(firstEvent(create)).toMatchObject({
      action: "doc.restore",
      target: { slug: "posts", docId: "7" },
    });
  });

  it("applies the flags of a bulk update to every document it changes", async () => {
    const { req: callerReq, create } = fakeRequest();
    const req = await runBeforeOperation(posts.hooks?.beforeOperation, {
      operation: "update",
      args: { where: { id: { in: [1, 2] } }, draft: true },
      req: callerReq,
      collection: postsCollection,
    });
    for (const id of [1, 2]) {
      await runHooks(posts.hooks?.beforeChange, {
        operation: "update",
        originalDoc: { id },
        data: {},
        req,
        collection: postsCollection,
      });
      await runUpdate(posts.hooks, req, {
        previousDoc: { id, _status: "published" },
        doc: { id, _status: "draft" },
      });
    }
    expect(recordedActions(create)).toEqual(["doc.update", "doc.update"]);
  });

  describe("saves that run inside other saves", () => {
    const drafts = audited({ slug: "posts", versions: { drafts: true }, fields: [] });
    const runOperation = (hooks: Hooks, req: FakeRequest, operation: string, args: Doc) =>
      runBeforeOperation(hooks?.beforeOperation, {
        operation,
        args,
        req,
        collection: postsCollection,
      });
    const runBeforeChangeOf = (hooks: Hooks, req: FakeRequest, originalDoc: Doc, data: Doc = {}) =>
      runHooks(hooks?.beforeChange, {
        operation: "update",
        originalDoc,
        data,
        req,
        collection: postsCollection,
      });

    it("leaves no flags on the request once an update by id is recorded", async () => {
      const { req } = fakeRequest();
      const saveReq = await runOperation(posts.hooks, req, "update", { id: 7 });
      await runBeforeChangeOf(posts.hooks, saveReq, { id: 7, title: "A" });
      await runUpdate(posts.hooks, saveReq, {
        previousDoc: { id: 7, title: "A" },
        doc: { id: 7, title: "B" },
      });
      expect(req.context.__auditOp).toBeUndefined();
    });

    it("leaves no flags on the request once every document of a bulk update is recorded", async () => {
      const { req } = fakeRequest();
      const bulkReq = await runOperation(posts.hooks, req, "update", {
        where: { id: { in: [1, 2] } },
        draft: true,
      });
      for (const id of [1, 2]) {
        await runBeforeChangeOf(posts.hooks, bulkReq, { id });
        await runUpdate(posts.hooks, bulkReq, { previousDoc: { id }, doc: { id, title: "T" } });
      }
      expect(req.context.__auditOp).toBeUndefined();
    });

    it("keeps the outer draft save a doc.update when an afterChange hook updates the same document", async () => {
      const { req, db, create } = fakeRequest();
      db.findOne = vi.fn().mockResolvedValue({ id: 7, _status: "published" });
      const latestDraft = { id: 7, title: "A", _status: "draft" };
      const outerReq = await runOperation(drafts.hooks, req, "update", {
        id: 7,
        draft: true,
        data: { title: "B" },
      });
      await runBeforeChangeOf(drafts.hooks, outerReq, latestDraft, {
        title: "B",
        _status: "draft",
      });
      const nestedReq = await runOperation(drafts.hooks, outerReq, "update", {
        id: 7,
        data: { _status: "draft" },
      });
      await runBeforeChangeOf(drafts.hooks, nestedReq, latestDraft, { _status: "draft" });
      await runUpdate(drafts.hooks, nestedReq, {
        previousDoc: latestDraft,
        doc: { ...latestDraft, title: "C" },
      });
      await runUpdate(drafts.hooks, outerReq, {
        previousDoc: latestDraft,
        doc: { ...latestDraft, title: "B" },
      });
      expect(recordedActions(create)).toEqual(["doc.unpublish", "doc.update"]);
    });

    it("still skips the outer autosave when an afterChange hook updates the same document", async () => {
      const { req, create } = fakeRequest();
      const autosaved = audited({
        slug: "posts",
        versions: { drafts: { autosave: true } },
        fields: [],
      });
      const outerReq = await runOperation(autosaved.hooks, req, "update", {
        id: 7,
        autosave: true,
        draft: true,
      });
      await runBeforeChangeOf(autosaved.hooks, outerReq, { id: 7 });
      const nestedReq = await runOperation(autosaved.hooks, outerReq, "update", { id: 7 });
      await runBeforeChangeOf(autosaved.hooks, nestedReq, { id: 7 });
      await runUpdate(autosaved.hooks, nestedReq, {
        previousDoc: { id: 7, title: "A" },
        doc: { id: 7, title: "C" },
      });
      await runUpdate(autosaved.hooks, outerReq, {
        previousDoc: { id: 7, title: "A" },
        doc: { id: 7, title: "B" },
      });
      expect(recordedActions(create)).toEqual(["doc.update"]);
      expect(firstEvent(create)?.changes).toEqual(["title"]);
    });
  });

  describe("a bulk update of a document that a save by id also saves", () => {
    const autosaved = audited({
      slug: "posts",
      versions: { drafts: { autosave: true } },
      fields: [],
    });
    const runOperation = (hooks: Hooks, req: FakeRequest, operation: string, args: Doc) =>
      runBeforeOperation(hooks?.beforeOperation, {
        operation,
        args,
        req,
        collection: postsCollection,
      });
    const runBeforeChangeOf = (hooks: Hooks, req: FakeRequest, originalDoc: Doc, data: Doc) =>
      runHooks(hooks?.beforeChange, {
        operation: "update",
        originalDoc,
        data,
        req,
        collection: postsCollection,
      });
    const runBulkUpdate = async (
      hooks: Hooks,
      req: FakeRequest,
      change: { previousDoc: Doc; doc: Doc; data: Doc }
    ) => {
      const bulkReq = await runOperation(hooks, req, "update", {
        where: { id: { equals: change.doc.id } },
        data: change.data,
      });
      await runBeforeChangeOf(hooks, bulkReq, change.previousDoc, change.data);
      await runUpdate(hooks, bulkReq, change);
    };
    const noteChangedByBulk = {
      previousDoc: { id: 7, title: "B", note: "a" },
      doc: { id: 7, title: "B", note: "b" },
      data: { note: "b" },
    };
    const actionsWithChanges = (create: ReturnType<typeof fakeRequest>["create"]) =>
      recordedEvents(create).map((event) => [event.action, event.changes]);

    it("records the bulk update an afterChange hook runs and still skips the autosave tick", async () => {
      const { req, create } = fakeRequest();
      const tick = { title: "B", _status: "draft" };
      const tickReq = await runOperation(autosaved.hooks, req, "update", {
        id: 7,
        autosave: true,
        draft: true,
        data: tick,
      });
      await runBeforeChangeOf(autosaved.hooks, tickReq, { id: 7, title: "A" }, tick);
      await runBulkUpdate(autosaved.hooks, tickReq, noteChangedByBulk);
      await runUpdate(autosaved.hooks, tickReq, {
        previousDoc: { id: 7, title: "A", note: "a" },
        doc: { id: 7, title: "B", note: "a" },
        data: tick,
      });
      expect(actionsWithChanges(create)).toEqual([["doc.update", ["note"]]]);
    });

    it("keeps the restore and the bulk update an afterChange hook runs apart", async () => {
      const { req, create } = fakeRequest();
      await runOperation(posts.hooks, req, "restoreVersion", { id: "v1" });
      req.context.isRestoringVersion = true;
      await runBeforeChangeOf(posts.hooks, req, { id: 7, title: "A", note: "a" }, { title: "B" });
      await runBulkUpdate(posts.hooks, req, noteChangedByBulk);
      await runUpdate(posts.hooks, req, {
        previousDoc: { id: 7, title: "A", note: "a" },
        doc: { id: 7, title: "B", note: "a" },
      });
      expect(actionsWithChanges(create)).toEqual([
        ["doc.update", ["note"]],
        ["doc.restore", ["title"]],
      ]);
    });

    it("compares only the selected fields of the outer save", async () => {
      const { req, create } = fakeRequest();
      const data = { title: "B" };
      const saveReq = await runOperation(posts.hooks, req, "update", {
        id: 7,
        data,
        select: { title: true },
      });
      await runBeforeChangeOf(posts.hooks, saveReq, { id: 7, title: "A", note: "a" }, data);
      await runBulkUpdate(posts.hooks, saveReq, noteChangedByBulk);
      await runUpdate(posts.hooks, saveReq, {
        previousDoc: { id: 7, title: "A", note: "a", group: "g" },
        doc: { id: 7, title: "B" },
        data,
      });
      expect(actionsWithChanges(create)).toEqual([
        ["doc.update", ["note"]],
        ["doc.update", ["title"]],
      ]);
    });

    it("does not give a later bulk update the flags of a save that failed before it was written", async () => {
      const { req, create } = fakeRequest();
      await runOperation(autosaved.hooks, req, "update", {
        id: 7,
        autosave: true,
        draft: true,
        data: { title: "rejected" },
      });
      await runBulkUpdate(autosaved.hooks, req, noteChangedByBulk);
      expect(actionsWithChanges(create)).toEqual([["doc.update", ["note"]]]);
    });
  });

  describe("operations that overlap on one request", () => {
    const drafts = audited({ slug: "posts", versions: { drafts: true }, fields: [] });
    const startOperation = (
      hooks: Hooks,
      req: FakeRequest,
      args: Doc,
      collection: unknown = postsCollection
    ) => runBeforeOperation(hooks?.beforeOperation, { operation: "update", args, req, collection });
    const saveDocument = async (
      hooks: Hooks,
      req: FakeRequest,
      change: { previousDoc: Doc; doc: Doc; data: Doc },
      collection: unknown = postsCollection
    ) => {
      const data = await runBeforeChange(hooks, {
        operation: "update",
        originalDoc: change.previousDoc,
        data: change.data,
        req,
        collection,
      });
      await runHooks(hooks?.afterChange, { operation: "update", ...change, data, req, collection });
    };
    const actionsWithChanges = (create: ReturnType<typeof fakeRequest>["create"]) =>
      recordedEvents(create).map((event) => [event.action, event.changes]);

    it("keeps a draft save by id a doc.update while a later bulk update of another document runs", async () => {
      const { req, db, create } = fakeRequest();
      db.findOne = vi.fn().mockResolvedValue({ id: 7, _status: "published" });
      const saveReq = await startOperation(drafts.hooks, req, { id: 7, draft: true });
      const bulkReq = await startOperation(drafts.hooks, req, { where: { id: { equals: 8 } } });
      await saveDocument(drafts.hooks, saveReq, draftSave(7));
      await saveDocument(drafts.hooks, bulkReq, noteSave(8));
      expect(actionsWithChanges(create)).toEqual([
        ["doc.update", ["title", "_status"]],
        ["doc.update", ["note"]],
      ]);
      expect(req.context.__auditOp).toBeUndefined();
    });

    it("records a password change by id while a later bulk update of another user runs", async () => {
      const { req, create } = fakeRequest();
      const passwordReq = await startOperation(
        users.hooks,
        req,
        { id: 2, data: { password: "new-secret-123" } },
        usersCollection
      );
      const bulkReq = await startOperation(
        users.hooks,
        req,
        { where: { id: { equals: 3 } }, data: { role: "admin" } },
        usersCollection
      );
      await saveDocument(
        users.hooks,
        passwordReq,
        { previousDoc: { id: 2 }, doc: { id: 2 }, data: { password: "new-secret-123" } },
        usersCollection
      );
      await saveDocument(
        users.hooks,
        bulkReq,
        { previousDoc: { id: 3, role: "editor" }, doc: { id: 3, role: "admin" }, data: {} },
        usersCollection
      );
      expect(actionsWithChanges(create)).toEqual([
        ["doc.update", ["password"]],
        ["doc.update", ["role"]],
      ]);
      expect(req.context.__auditOp).toBeUndefined();
    });

    it("keeps a bulk draft save a doc.update while a later bulk update runs", async () => {
      const { req, create } = fakeRequest();
      const draftReq = await startOperation(drafts.hooks, req, {
        where: { id: { equals: 7 } },
        draft: true,
      });
      const bulkReq = await startOperation(drafts.hooks, req, { where: { id: { equals: 8 } } });
      await saveDocument(drafts.hooks, draftReq, draftSave(7));
      await saveDocument(drafts.hooks, bulkReq, noteSave(8));
      expect(actionsWithChanges(create)).toEqual([
        ["doc.update", ["title", "_status"]],
        ["doc.update", ["note"]],
      ]);
    });

    it("keeps the flags of a bulk update for its other documents while one of them runs a nested bulk update", async () => {
      const { req, create } = fakeRequest();
      const outerReq = await startOperation(drafts.hooks, req, {
        where: { group: { equals: "g" } },
        draft: true,
      });
      const nestedReq = await startOperation(drafts.hooks, outerReq, {
        where: { id: { equals: 9 } },
      });
      await saveDocument(drafts.hooks, outerReq, draftSave(8));
      await saveDocument(drafts.hooks, nestedReq, noteSave(9));
      await saveDocument(drafts.hooks, outerReq, draftSave(7));
      expect(actionsWithChanges(create)).toEqual([
        ["doc.update", ["title", "_status"]],
        ["doc.update", ["note"]],
        ["doc.update", ["title", "_status"]],
      ]);
    });
  });

  describe("publish in autosave collections", () => {
    const autosaved = audited({
      slug: "pages",
      versions: { drafts: { autosave: true } },
      fields: [],
    });
    const drafted = audited({ slug: "pages", versions: { drafts: true }, fields: [] });
    const publishOverAutosavedDraft = {
      previousDoc: { id: 1, _status: "draft", title: "New", body: "New" },
      doc: { id: 1, _status: "published", title: "New", body: "New" },
      collection: { slug: "pages" },
    };

    const requestWithVersions = (findVersions: ReturnType<typeof vi.fn>) => {
      const request = fakeRequest();
      request.db.findVersions = findVersions;
      return request;
    };

    const publishOverDraft = async (
      hooks: Hooks,
      req: FakeRequest,
      {
        written,
        beforeAuditAfterChange,
      }: {
        written?: Doc;
        beforeAuditAfterChange?: (publishReq: FakeRequest) => Promise<void>;
      } = {}
    ) => {
      const publishReq = await runBeforeOperation(hooks?.beforeOperation, {
        operation: "update",
        args: { id: 1, data: { _status: "published" } },
        req,
        collection: { slug: "pages" },
      });
      await runHooks(hooks?.beforeChange, {
        operation: "update",
        originalDoc: publishOverAutosavedDraft.previousDoc,
        data: { _status: "published" },
        req: publishReq,
        collection: { slug: "pages" },
      });
      if (written) captureWrittenDoc(publishReq, "pages", 1, written);
      await beforeAuditAfterChange?.(publishReq);
      await runUpdate(hooks, publishReq, publishOverAutosavedDraft);
    };

    const publishedTitleNew = { id: 1, _status: "published", title: "New", body: "New" };

    it("diffs what the publish wrote against the stored document live before it, read once by id", async () => {
      const findVersions = vi.fn();
      const { req, db, create } = requestWithVersions(findVersions);
      const findOne = vi
        .fn()
        .mockResolvedValue({ id: 1, _status: "published", title: "Old", body: "New" });
      db.findOne = findOne;
      await publishOverDraft(autosaved.hooks, req, { written: publishedTitleNew });
      expect(findOne).toHaveBeenCalledTimes(1);
      expect(findOne.mock.calls[0]?.[0]).toMatchObject({
        collection: "pages",
        where: { id: { equals: 1 } },
        req,
      });
      expect(findVersions).not.toHaveBeenCalled();
      expect(firstEvent(create)).toMatchObject({ action: "doc.publish", changes: ["title"] });
    });

    it("lists every field of the document when no publish was live before it", async () => {
      const { req, db, create } = fakeRequest();
      db.findOne = vi
        .fn()
        .mockResolvedValue({ id: 1, _status: "draft", title: "New", body: "Old" });
      await publishOverDraft(autosaved.hooks, req, { written: publishedTitleNew });
      expect(firstEvent(create)?.changes).toEqual(["_status", "title", "body"]);
    });

    it("diffs the saved document against the live one when the write was not seen", async () => {
      const { req, db, create } = fakeRequest();
      db.findOne = vi
        .fn()
        .mockResolvedValue({ id: 1, _status: "published", title: "Old", body: "New" });
      await publishOverDraft(autosaved.hooks, req);
      expect(firstEvent(create)).toMatchObject({ action: "doc.publish", changes: ["title"] });
    });

    it("keeps what the publish wrote when an afterChange hook saves the same document before the audit hook", async () => {
      const { req, db, create } = fakeRequest();
      db.findOne = vi
        .fn()
        .mockResolvedValue({ id: 1, _status: "published", title: "New", body: "New" });
      const published = publishOverAutosavedDraft.doc;
      const touched = { note: "touched" };
      await publishOverDraft(autosaved.hooks, req, {
        written: { ...published, body: "Stored" },
        beforeAuditAfterChange: async (publishReq) => {
          const touchReq = await runBeforeOperation(autosaved.hooks?.beforeOperation, {
            operation: "update",
            args: { id: 1, data: touched },
            req: publishReq,
            collection: { slug: "pages" },
          });
          await runHooks(autosaved.hooks?.beforeChange, {
            operation: "update",
            originalDoc: published,
            data: touched,
            req: touchReq,
            collection: { slug: "pages" },
          });
          await runUpdate(autosaved.hooks, touchReq, {
            previousDoc: published,
            doc: { ...published, ...touched },
            collection: { slug: "pages" },
          });
        },
      });
      expect(recordedEvents(create).map((event) => [event.action, event.changes])).toEqual([
        ["doc.update", ["note"]],
        ["doc.publish", ["body"]],
      ]);
    });

    it("falls back to previousDoc and logs the error when the live document read fails", async () => {
      const { req, db, create, error } = fakeRequest();
      db.findOne = vi.fn().mockRejectedValue(new Error("db down"));
      await publishOverDraft(autosaved.hooks, req, { written: publishedTitleNew });
      expect(error).toHaveBeenCalledTimes(1);
      expect(firstEvent(create)).toMatchObject({ action: "doc.publish", changes: ["_status"] });
    });

    it("reads the live document inside a savepoint of the SQL transaction, so a failed read leaves it usable", async () => {
      const statements: string[] = [];
      const { req, db, create } = fakeRequest({ transactionID: "tx-1" });
      db.findOne = vi.fn(async () => {
        statements.push("READ");
        throw new Error("permission denied for table pages");
      });
      db.sessions = { "tx-1": { db: { name: "tx" } } };
      db.execute = vi.fn(async ({ raw }: { raw: string }) => {
        statements.push(raw.split(" audit_")[0] as string);
      });
      await publishOverDraft(autosaved.hooks, req, { written: publishedTitleNew });
      expect(statements.slice(0, 4)).toEqual([
        "SAVEPOINT",
        "READ",
        "ROLLBACK TO SAVEPOINT",
        "RELEASE SAVEPOINT",
      ]);
      expect(firstEvent(create)).toMatchObject({ action: "doc.publish", changes: ["_status"] });
    });

    it("does not read for other actions or non-autosave collections", async () => {
      const findVersions = vi.fn();
      const findOne = vi.fn();
      const update = requestWithVersions(findVersions);
      update.db.findOne = findOne;
      await runHooks(autosaved.hooks?.beforeChange, {
        operation: "update",
        originalDoc: { id: 1, _status: "published", title: "A" },
        data: { _status: "published" },
        req: update.req,
        collection: { slug: "pages" },
      });
      await runUpdate(autosaved.hooks, update.req, {
        ...publishOverAutosavedDraft,
        previousDoc: { id: 1, _status: "published", title: "A" },
        doc: { id: 1, _status: "published", title: "B" },
      });
      const draftsOnly = requestWithVersions(findVersions);
      draftsOnly.db.findOne = findOne;
      await publishOverDraft(drafted.hooks, draftsOnly.req);
      expect(findVersions).not.toHaveBeenCalled();
      expect(findOne).not.toHaveBeenCalled();
      expect(recordedActions(update.create)).toEqual(["doc.update"]);
      expect(recordedActions(draftsOnly.create)).toEqual(["doc.publish"]);
    });

    const runBulkPublish = async (
      req: FakeRequest,
      args: Doc,
      change: { previousDoc: Doc; doc: Doc }
    ) => {
      const bulkReq = await runBeforeOperation(autosaved.hooks?.beforeOperation, {
        operation: "update",
        args: { where: { id: { in: [1] } }, ...args },
        req,
        collection: { slug: "pages" },
      });
      await runHooks(autosaved.hooks?.beforeChange, {
        operation: "update",
        originalDoc: change.previousDoc,
        data: { _status: change.doc._status },
        req: bulkReq,
        collection: { slug: "pages" },
      });
      await runUpdate(autosaved.hooks, bulkReq, { ...change, collection: { slug: "pages" } });
    };

    it("diffs a bulk publish against the main document it loaded, without reading", async () => {
      const findVersions = vi.fn();
      const findOne = vi.fn();
      const { req, create, db } = requestWithVersions(findVersions);
      db.findOne = findOne;
      await runBulkPublish(
        req,
        {},
        {
          previousDoc: { id: 1, _status: "draft", title: "Old", body: "Same" },
          doc: { id: 1, _status: "published", title: "New", body: "Same" },
        }
      );
      expect(findVersions).not.toHaveBeenCalled();
      expect(findOne).not.toHaveBeenCalled();
      expect(firstEvent(create)).toMatchObject({
        action: "doc.publish",
        changes: ["_status", "title"],
      });
    });

    it("records a bulk unpublish from the main document it loaded, without reading", async () => {
      const findVersions = vi.fn();
      const findOne = vi.fn();
      const { req, create, db } = requestWithVersions(findVersions);
      db.findOne = findOne;
      await runBulkPublish(
        req,
        {},
        {
          previousDoc: { id: 1, _status: "published", title: "Same" },
          doc: { id: 1, _status: "draft", title: "Same" },
        }
      );
      expect(findVersions).not.toHaveBeenCalled();
      expect(findOne).not.toHaveBeenCalled();
      expect(firstEvent(create)).toMatchObject({ action: "doc.unpublish", changes: ["_status"] });
    });

    it("diffs a bulk publish over drafts against the latest draft it loaded, without reading, because its documents share one transaction in parallel", async () => {
      const findVersions = vi.fn();
      const findOne = vi.fn();
      const { req, create, db } = requestWithVersions(findVersions);
      db.findOne = findOne;
      await runBulkPublish(
        req,
        { draft: true },
        {
          previousDoc: { id: 1, _status: "draft", title: "Draft", body: "Same" },
          doc: { id: 1, _status: "published", title: "Published", body: "Same" },
        }
      );
      expect(findVersions).not.toHaveBeenCalled();
      expect(findOne).not.toHaveBeenCalled();
      expect(firstEvent(create)).toMatchObject({
        action: "doc.publish",
        changes: ["_status", "title"],
      });
    });
  });

  it("adds target.locale only for localized collections", async () => {
    const localized = audited({
      slug: "pages",
      fields: [
        { name: "meta", type: "group", fields: [{ name: "t", type: "text", localized: true }] },
      ],
    });
    const change = {
      previousDoc: { id: 1, title: "A" },
      doc: { id: 1, title: "B" },
      collection: { slug: "pages" },
    };
    const inLocalized = fakeRequest({ locale: "de" });
    await runUpdate(localized.hooks, inLocalized.req, change);
    expect(firstEvent(inLocalized.create)?.target.locale).toBe("de");

    const inPlain = fakeRequest({ locale: "de" });
    await runUpdate(posts.hooks, inPlain.req, change);
    expect(firstEvent(inPlain.create)?.target).not.toHaveProperty("locale");
  });

  describe("a localized save whose own hooks read the document in another locale", () => {
    const localizedPages = audited({
      slug: "pages",
      fields: [{ name: "title", type: "text", localized: true }],
    });
    const pagesCollection = { slug: "pages" };

    const saveReadInGermanAfterwards = async (args: Record<string, unknown>) => {
      const caller = fakeRequest({ locale: "en", fallbackLocale: false });
      const req = await runBeforeOperation(localizedPages.hooks?.beforeOperation, {
        operation: "update",
        args: { id: 1, data: { title: "B" }, ...args },
        req: caller.req,
        collection: pagesCollection,
      });
      await runBeforeChange(localizedPages.hooks, {
        operation: "update",
        originalDoc: { id: 1, title: "A" },
        data: { title: "B" },
        req,
        collection: pagesCollection,
      });
      Object.assign(req, { locale: "de", fallbackLocale: "en" });
      await runUpdate(localizedPages.hooks, req, {
        previousDoc: { id: 1, title: "A" },
        doc: { id: 1, title: "B" },
        data: { title: "B" },
        collection: pagesCollection,
      });
      return firstEvent(caller.create);
    };

    it("records the locale the save was made in", async () => {
      expect(await saveReadInGermanAfterwards({})).toMatchObject({
        action: "doc.update",
        target: { slug: "pages", docId: "1", locale: "en" },
        changes: ["title"],
      });
    });

    it("records the locale a publish was limited to", async () => {
      const event = await saveReadInGermanAfterwards({ publishSpecificLocale: "fr" });
      expect(event?.target.locale).toBe("fr");
    });

    it("records the locale a bulk update wrote, which Payload does not limit to the publish locale", async () => {
      const event = await saveReadInGermanAfterwards({
        id: undefined,
        where: { id: { equals: 1 } },
        publishSpecificLocale: "fr",
      });
      expect(event?.target.locale).toBe("en");
    });
  });

  describe("a localized operation whose own hooks read documents in another locale", () => {
    const localizedMembers = audited({
      slug: "members",
      auth: true,
      fields: [{ name: "nickname", type: "text", localized: true }],
    });
    const membersCollection = { slug: "members" };

    const startedInEnglishThenReadInGerman = async (
      operation: string,
      args: object = { id: 4 }
    ) => {
      const caller = fakeRequest({ locale: "en" });
      const req = await runBeforeOperation(localizedMembers.hooks?.beforeOperation, {
        operation,
        args,
        req: caller.req,
        collection: membersCollection,
      });
      Object.assign(req, { locale: "de" });
      return { req, create: caller.create };
    };

    it("records a delete in the locale it was made in", async () => {
      const { req, create } = await startedInEnglishThenReadInGerman("delete");
      await runHooks(localizedMembers.hooks?.beforeDelete, {
        id: 4,
        req,
        collection: membersCollection,
      });
      await runHooks(localizedMembers.hooks?.afterDelete, {
        id: 4,
        doc: { id: 4 },
        req,
        collection: membersCollection,
      });
      expect(firstEvent(create)).toMatchObject({
        action: "doc.delete",
        target: { slug: "members", docId: "4", locale: "en" },
      });
    });

    it("records a login in the locale it was made in", async () => {
      const { req, create } = await startedInEnglishThenReadInGerman("login");
      await runHooks(localizedMembers.hooks?.afterLogin, {
        user: { id: 4, email: "m@example.com" },
        req,
        collection: membersCollection,
        token: "t",
      });
      expect(firstEvent(create)).toMatchObject({
        action: "auth.login",
        target: { kind: "auth", slug: "members", docId: "4", locale: "en" },
      });
    });

    it("records a restore in the locale it was made in", async () => {
      const { req, create } = await startedInEnglishThenReadInGerman("restoreVersion", {
        id: "v1",
      });
      req.context.isRestoringVersion = true;
      await runHooks(localizedMembers.hooks?.beforeChange, {
        operation: "update",
        originalDoc: { id: 4, nickname: "B" },
        data: { nickname: "A" },
        req,
        collection: membersCollection,
      });
      await runUpdate(localizedMembers.hooks, req, {
        previousDoc: { id: 4, nickname: "B" },
        doc: { id: 4, nickname: "A" },
        collection: membersCollection,
      });
      expect(firstEvent(create)).toMatchObject({
        action: "doc.restore",
        target: { slug: "members", docId: "4", locale: "en" },
      });
    });

    it("records a duplicate in the locale it was made in", async () => {
      const data = { nickname: "Copy" };
      const { req, create } = await startedInEnglishThenReadInGerman("create", {
        data,
        duplicateFromID: 4,
      });
      await runHooks(localizedMembers.hooks?.beforeChange, {
        operation: "create",
        originalDoc: { nickname: "Orig" },
        data,
        req,
        collection: membersCollection,
      });
      await runHooks(localizedMembers.hooks?.afterChange, {
        operation: "create",
        data,
        previousDoc: {},
        doc: { id: 5, nickname: "Copy" },
        req,
        collection: membersCollection,
      });
      expect(firstEvent(create)).toMatchObject({
        action: "doc.create",
        target: { slug: "members", docId: "5", locale: "en" },
      });
    });

    it("records a password reset request in the locale it was made in", async () => {
      const { req, create } = await startedInEnglishThenReadInGerman("forgotPassword", {
        data: { email: "m@example.com" },
      });
      await runHooks(localizedMembers.hooks?.afterForgotPassword, {
        args: { req, data: { email: "m@example.com" } },
        collection: membersCollection,
      });
      expect(firstEvent(create)).toMatchObject({
        action: "auth.password_reset_requested",
        target: { kind: "auth", slug: "members", label: "m@example.com", locale: "en" },
      });
    });

    it("records a password reset in the locale it was made in", async () => {
      const { req, create } = await startedInEnglishThenReadInGerman("resetPassword", {
        data: { token: "t", password: "p" },
      });
      await runHooks(localizedMembers.hooks?.afterOperation, {
        operation: "resetPassword",
        req,
        result: { token: "t", user: { id: 4, email: "m@example.com" } },
        collection: membersCollection,
      });
      expect(firstEvent(create)).toMatchObject({
        action: "auth.password_reset",
        target: { kind: "auth", slug: "members", docId: "4", locale: "en" },
      });
    });
  });

  it("writes doc.delete", async () => {
    const { req, create } = fakeRequest();
    await runHooks(posts.hooks?.afterDelete, {
      id: 5,
      doc: { id: 5, title: "T" },
      req,
      collection: postsCollection,
    });
    expect(firstEvent(create)).toMatchObject({
      action: "doc.delete",
      target: { slug: "posts", docId: "5", label: "T" },
    });
  });

  it("records keys of an API key collection as documents of that collection", async () => {
    const keys = audited({ slug: "payload-mcp-api-keys", fields: [] });
    const { req, create } = fakeRequest();
    const collection = { slug: "payload-mcp-api-keys" };
    await runHooks(keys.hooks?.beforeOperation, { operation: "create", args: {}, req, collection });
    await runHooks(keys.hooks?.afterChange, {
      operation: "create",
      doc: { id: 1, label: "k" },
      req,
      collection,
    });
    await runHooks(keys.hooks?.afterDelete, { id: 1, doc: { id: 1 }, req, collection });
    expect(recordedEvents(create).map((event) => [event.action, event.target.slug])).toEqual([
      ["doc.create", "payload-mcp-api-keys"],
      ["doc.delete", "payload-mcp-api-keys"],
    ]);
  });

  it("records switching a document's API key on or off as doc.update of enableAPIKey", async () => {
    const bots = audited({ slug: "bots", auth: { useAPIKey: true }, fields: [] });
    const { req, create } = fakeRequest();
    const collection = { slug: "bots" };
    const update = (previousDoc: Doc, doc: Doc) =>
      runHooks(bots.hooks?.afterChange, { operation: "update", previousDoc, doc, req, collection });
    await update(
      { id: 1, enableAPIKey: true, name: "a" },
      { id: 1, enableAPIKey: false, name: "a" }
    );
    await update(
      { id: 1, enableAPIKey: false, name: "a" },
      { id: 1, enableAPIKey: true, name: "a" }
    );
    expect(recordedEvents(create).map((event) => [event.action, event.changes])).toEqual([
      ["doc.update", ["enableAPIKey"]],
      ["doc.update", ["enableAPIKey"]],
    ]);
  });

  describe("role changes in auth collections", () => {
    const actionsWithChangesOf = (create: ReturnType<typeof fakeRequest>["create"]) =>
      recordedEvents(create).map((event) => [event.action, event.changes]);

    it("records a role change as doc.update with the role among the changes", async () => {
      const { req, create } = fakeRequest();
      await runUpdate(users.hooks, req, {
        previousDoc: { id: 2, email: "x@example.com", role: "editor" },
        doc: { id: 2, email: "x@example.com", role: "admin" },
        collection: { slug: "users", admin: { useAsTitle: "email" } },
      });
      expect(recordedEvents(create)).toEqual([
        expect.objectContaining({
          action: "doc.update",
          target: expect.objectContaining({ slug: "users", docId: "2" }),
          changes: ["role"],
        }),
      ]);
    });

    it("compares relationship roles by id, so a populated doc is not a role change", async () => {
      const { req, create } = fakeRequest();
      await runUpdate(users.hooks, req, {
        previousDoc: { id: 2, email: "x@example.com", role: 3, roles: [1, 2] },
        doc: {
          id: 2,
          email: "y@example.com",
          role: { id: 3, name: "Editor", permissions: { publish: true } },
          roles: [
            { id: 1, name: "A" },
            { id: 2, name: "B" },
          ],
        },
        collection: usersCollection,
      });
      expect(actionsWithChangesOf(create)).toEqual([["doc.update", ["email"]]]);
    });

    it("reports a relationship role that points to another document", async () => {
      const { req, create } = fakeRequest();
      await runUpdate(users.hooks, req, {
        previousDoc: { id: 2, role: 3, roles: [1] },
        doc: { id: 2, role: { id: 4, name: "Admin" }, roles: [{ id: 1, name: "A" }] },
        collection: usersCollection,
      });
      expect(actionsWithChangesOf(create)).toEqual([["doc.update", ["role"]]]);
    });
  });

  describe("password and API key changes", () => {
    const usersWithApiKeys = audited({
      slug: "users",
      auth: { useAPIKey: true },
      fields: [{ name: "name", type: "text" }],
    });

    const saveUser = async (hooks: Hooks, submitted: Doc) => {
      const { req: callerReq, create } = fakeRequest();
      const previousDoc = { id: 2, email: "x@example.com", name: "A" };
      const req = await runBeforeOperation(hooks?.beforeOperation, {
        operation: "update",
        args: { id: 2, data: submitted },
        req: callerReq,
        collection: usersCollection,
      });
      const data = await runBeforeChange(hooks, {
        operation: "update",
        originalDoc: previousDoc,
        data: submitted,
        req,
        collection: usersCollection,
      });
      const { password: _password, apiKey: _apiKey, ...storedFields } = data;
      delete data.password;
      await runHooks(hooks?.afterChange, {
        operation: "update",
        previousDoc,
        doc: { ...previousDoc, ...storedFields },
        data,
        req,
        collection: usersCollection,
      });
      return create;
    };

    it("logs a password change by name only", async () => {
      const create = await saveUser(usersWithApiKeys.hooks, { password: "new-secret-123" });
      expect(recordedActions(create)).toEqual(["doc.update"]);
      expect(firstEvent(create)?.changes).toEqual(["password"]);
      expect(JSON.stringify(create.mock.calls)).not.toContain("new-secret-123");
    });

    it("logs a regenerated API key by name only, next to other changes", async () => {
      const create = await saveUser(usersWithApiKeys.hooks, {
        apiKey: "k-0123456789",
        enableAPIKey: true,
        name: "B",
      });
      expect(firstEvent(create)?.changes).toEqual(["apiKey", "name", "enableAPIKey"]);
      expect(JSON.stringify(create.mock.calls)).not.toContain("k-0123456789");
    });

    it("logs a removed API key", async () => {
      const create = await saveUser(usersWithApiKeys.hooks, { apiKey: null, enableAPIKey: false });
      expect(firstEvent(create)?.changes).toEqual(["apiKey", "enableAPIKey"]);
    });

    it("ignores an empty password and a save without secrets", async () => {
      expect(recordedActions(await saveUser(usersWithApiKeys.hooks, { password: "" }))).toEqual([]);
      expect(recordedActions(await saveUser(usersWithApiKeys.hooks, {}))).toEqual([]);
    });

    it("does not flag password or apiKey outside auth collections", async () => {
      const plain = audited({ slug: "users", fields: [{ name: "password", type: "text" }] });
      const create = await saveUser(plain.hooks, { password: "x", apiKey: "y" });
      expect(recordedActions(create)).toEqual([]);
    });

    it("does not flag a password when the local strategy is disabled", async () => {
      const sso = audited({ slug: "users", auth: { disableLocalStrategy: true }, fields: [] });
      expect(recordedActions(await saveUser(sso.hooks, { password: "x" }))).toEqual([]);
    });

    it("logs a password change although a later beforeChange hook replaced the data object", async () => {
      const create = await saveUser(withLaterHookCopyingData(usersWithApiKeys).hooks, {
        password: "new-secret-123",
      });
      expect(recordedActions(create)).toEqual(["doc.update"]);
      expect(firstEvent(create)?.changes).toEqual(["password"]);
    });

    it("does not flag a password of a draft save, which Payload does not store", async () => {
      const draftUsers = audited({
        slug: "users",
        auth: true,
        versions: { drafts: true },
        fields: [],
      });
      const { req: callerReq, create } = fakeRequest();
      const previousDoc = { id: 2, email: "x@example.com" };
      const data = { password: "p" };
      const req = await runBeforeOperation(draftUsers.hooks?.beforeOperation, {
        operation: "update",
        args: { id: 2, data, draft: true },
        req: callerReq,
        collection: usersCollection,
      });
      await runUpdate(draftUsers.hooks, req, { previousDoc, doc: { ...previousDoc } });
      expect(recordedActions(create)).toEqual([]);
    });

    it("flags a password on every document of a bulk update", async () => {
      const { req: callerReq, create } = fakeRequest();
      const req = await runBeforeOperation(usersWithApiKeys.hooks?.beforeOperation, {
        operation: "update",
        args: { where: {}, data: { password: "p" } },
        req: callerReq,
        collection: usersCollection,
      });
      for (const id of [2, 3]) {
        await runUpdate(usersWithApiKeys.hooks, req, {
          previousDoc: { id },
          doc: { id },
          collection: usersCollection,
        });
      }
      expect(recordedEvents(create).map((event) => event.changes)).toEqual([
        ["password"],
        ["password"],
      ]);
    });

    it("keeps password inside maxChangedPaths", async () => {
      const narrow = audited({ slug: "users", auth: true, fields: [] }, { maxChangedPaths: 2 });
      const create = await saveUser(narrow.hooks, { password: "p", a: 1, b: 2, c: 3 });
      expect(firstEvent(create)?.changes).toEqual(["password", "a", "…"]);
    });
  });

  describe("localized fields read with a fallback locale", () => {
    const localizedPosts = audited({
      slug: "posts",
      fields: [
        { name: "title", type: "text", localized: true },
        { name: "revision", type: "text", localized: true },
        { name: "body", type: "text" },
        {
          name: "links",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ],
    });

    const saveInGerman = async (
      fallbackLocale: unknown,
      change: { previousDoc: Doc; data: Doc; written: Doc; doc: Doc }
    ) => {
      const { req: callerReq, create } = fakeRequest({ locale: "de", fallbackLocale });
      const req = await runBeforeOperation(localizedPosts.hooks?.beforeOperation, {
        operation: "update",
        args: { id: 1, data: change.data },
        req: callerReq,
        collection: postsCollection,
      });
      await runHooks(localizedPosts.hooks?.beforeChange, {
        operation: "update",
        originalDoc: change.previousDoc,
        data: change.data,
        req,
        collection: postsCollection,
      });
      captureWrittenDoc(req, "posts", 1, change.written);
      await runUpdate(localizedPosts.hooks, req, change);
      return create;
    };

    const clearedGermanTitleShownInEnglish = {
      previousDoc: { id: 1, title: "Brand", body: "b", links: [{ id: "l1", label: "Home" }] },
      data: { title: null, body: "b", links: [{ id: "l1", label: null }] },
      written: {
        id: 1,
        title: { en: "Brand" },
        body: "b",
        links: [{ id: "l1", label: { en: "Home" } }],
      },
      doc: { id: 1, title: "Brand", body: "b", links: [{ id: "l1", label: "Home" }] },
    };

    it("compares the values stored in the locale of the save, not the fallback values the saved document shows", async () => {
      const create = await saveInGerman("en", clearedGermanTitleShownInEnglish);
      expect(firstEvent(create)?.changes).toEqual(["title", "links.0.label"]);
    });

    it("compares the saved document when the request has no fallback locale", async () => {
      const create = await saveInGerman(false, clearedGermanTitleShownInEnglish);
      expect(create).not.toHaveBeenCalled();
    });

    it("reports nothing for a no-op save read with a fallback locale", async () => {
      const create = await saveInGerman("en", {
        previousDoc: { id: 1, title: null, body: "b" },
        data: { title: null, body: "b" },
        written: { id: 1, title: { en: "Brand" }, body: "b" },
        doc: { id: 1, title: "Brand", body: "b" },
      });
      expect(create).not.toHaveBeenCalled();
    });

    it("reports a localized value only a field hook changed", async () => {
      const create = await saveInGerman("en", {
        previousDoc: { id: 1, title: "Hallo", revision: "r2" },
        data: { title: "Hallo" },
        written: { id: 1, title: { en: "Hello", de: "Hallo" }, revision: { en: "r1", de: "r3" } },
        doc: { id: 1, title: "Hallo", revision: "r3" },
      });
      expect(firstEvent(create)?.changes).toEqual(["revision"]);
    });

    it("reports nothing when a field hook stores the submitted localized value as it was", async () => {
      const create = await saveInGerman("en", {
        previousDoc: { id: 1, title: "DE" },
        data: { title: " de " },
        written: { id: 1, title: { en: "EN", de: "DE" } },
        doc: { id: 1, title: "DE" },
      });
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe("fields the caller cannot read", () => {
    const usersWithRestrictedFields = audited({
      slug: "users",
      auth: true,
      fields: [
        { name: "title", type: "text" },
        { name: "internal", type: "text", hidden: true },
        { name: "salary", type: "number", access: { read: () => false } },
        { name: "role", type: "text", access: { read: () => false } },
        {
          type: "tabs",
          tabs: [
            { label: "A", fields: [{ name: "tabSecret", type: "text", hidden: true }] },
            { name: "named", fields: [{ name: "inner", type: "text", hidden: true }] },
          ],
        },
        { type: "collapsible", label: "c", fields: [{ name: "deep", type: "text", hidden: true }] },
        {
          name: "profile",
          type: "group",
          fields: [
            { name: "bio", type: "text" },
            { name: "ssn", type: "text", hidden: true },
            {
              name: "nested",
              type: "group",
              fields: [{ name: "pin", type: "text", access: { read: () => false } }],
            },
          ],
        },
        {
          name: "contacts",
          type: "array",
          fields: [
            { name: "label", type: "text" },
            { name: "phone", type: "text", access: { read: () => false } },
          ],
        },
        {
          name: "layout",
          type: "blocks",
          blocks: [
            {
              slug: "secretive",
              fields: [
                { name: "heading", type: "text" },
                { name: "note", type: "text", hidden: true },
              ],
            },
            { slug: "plain", fields: [{ name: "note", type: "text" }] },
          ],
        },
      ],
    });

    const updateAsCaller = async (previousDocReadWithFullAccess: Doc, docReadAsCaller: Doc) => {
      const { req, create } = fakeRequest();
      await runUpdate(usersWithRestrictedFields.hooks, req, {
        previousDoc: previousDocReadWithFullAccess,
        doc: docReadAsCaller,
        collection: usersCollection,
      });
      return create;
    };

    it("does not report hidden or read-restricted fields missing from the caller's doc", async () => {
      const create = await updateAsCaller(
        { id: 2, title: "a", internal: "i", salary: 1, role: "admin", tabSecret: "t", deep: "d" },
        { id: 2, title: "b" }
      );
      expect(recordedActions(create)).toEqual(["doc.update"]);
      expect(firstEvent(create)?.changes).toEqual(["title"]);
    });

    it("reports no role change when the caller cannot read the role field", async () => {
      const create = await updateAsCaller(
        { id: 2, title: "a", role: "admin" },
        { id: 2, title: "a" }
      );
      expect(recordedActions(create)).toEqual([]);
    });

    it("still reports restricted fields that the caller can read and that changed", async () => {
      const create = await updateAsCaller(
        { id: 2, salary: 1, internal: "i" },
        { id: 2, salary: 2, internal: "j" }
      );
      expect(firstEvent(create)?.changes).toEqual(["salary", "internal"]);
    });

    it("still reports a cleared value of an ordinary field", async () => {
      const create = await updateAsCaller({ id: 2, title: "a" }, { id: 2 });
      expect(firstEvent(create)?.changes).toEqual(["title"]);
    });

    it("does not report a hidden field of a named tab missing from the caller's doc", async () => {
      const create = await updateAsCaller({ id: 2, named: { inner: "x" } }, { id: 2, named: {} });
      expect(recordedActions(create)).toEqual([]);
      expect(firstEvent(create)?.changes ?? []).toEqual([]);
    });

    it("does not drop a top-level field that shares its name with a nested hidden field", async () => {
      const create = await updateAsCaller({ id: 2, inner: "x" }, { id: 2 });
      expect(firstEvent(create)?.changes).toEqual(["inner"]);
    });

    it("does not report hidden or read-restricted fields of groups missing from the caller's doc", async () => {
      const create = await updateAsCaller(
        { id: 2, profile: { bio: "a", ssn: "s", nested: { pin: "1" } } },
        { id: 2, profile: { bio: "a", nested: {} } }
      );
      expect(recordedActions(create)).toEqual([]);
    });

    it("does not report read-restricted fields of array rows missing from the caller's doc", async () => {
      const create = await updateAsCaller(
        {
          id: 2,
          contacts: [
            { id: "r1", label: "home", phone: "1" },
            { id: "r2", label: "work", phone: "2" },
          ],
        },
        {
          id: 2,
          contacts: [
            { id: "r1", label: "home" },
            { id: "r2", label: "office" },
          ],
        }
      );
      expect(firstEvent(create)?.changes).toEqual(["contacts.1.label"]);
    });

    it("does not report hidden fields of blocks of that type missing from the caller's doc", async () => {
      const unchanged = await updateAsCaller(
        { id: 2, layout: [{ id: "b1", blockType: "secretive", heading: "h", note: "n" }] },
        { id: 2, layout: [{ id: "b1", blockType: "secretive", heading: "h" }] }
      );
      expect(recordedActions(unchanged)).toEqual([]);
      const clearedPlainNote = await updateAsCaller(
        { id: 2, layout: [{ id: "b2", blockType: "plain", note: "n" }] },
        { id: 2, layout: [{ id: "b2", blockType: "plain" }] }
      );
      expect(firstEvent(clearedPlainNote)?.changes).toEqual(["layout.0.note"]);
    });

    it("still reports nested restricted fields that the caller can read and that changed", async () => {
      const create = await updateAsCaller(
        {
          id: 2,
          profile: { ssn: "s" },
          contacts: [{ id: "r1", phone: "1" }],
          layout: [{ id: "b1", blockType: "secretive", note: "n" }],
        },
        {
          id: 2,
          profile: { ssn: "t" },
          contacts: [{ id: "r1", phone: "2" }],
          layout: [{ id: "b1", blockType: "secretive", note: "m" }],
        }
      );
      expect(firstEvent(create)?.changes).toEqual([
        "profile.ssn",
        "contacts.0.phone",
        "layout.0.note",
      ]);
    });

    const saveAsCaller = async (change: { previousDoc: Doc; data: Doc; doc: Doc }) => {
      const { req, create } = fakeRequest();
      await runUpdate(usersWithRestrictedFields.hooks, req, {
        ...change,
        collection: usersCollection,
      });
      return create;
    };

    it("reports by name a write to a hidden or read-restricted field that the saved data changed", async () => {
      const create = await saveAsCaller({
        previousDoc: { id: 2, title: "a", internal: "i", salary: 1 },
        data: { title: "a", internal: "j", salary: 2 },
        doc: { id: 2, title: "a" },
      });
      expect(recordedActions(create)).toEqual(["doc.update"]);
      expect(firstEvent(create)?.changes).toEqual(["internal", "salary"]);
      expect(JSON.stringify(recordedEvents(create))).not.toContain('"j"');
    });

    it("reports a role change of a role field the caller cannot read", async () => {
      const create = await saveAsCaller({
        previousDoc: { id: 2, title: "a", role: "editor" },
        data: { title: "a", role: "admin" },
        doc: { id: 2, title: "a" },
      });
      expect(recordedActions(create)).toEqual(["doc.update"]);
      expect(recordedEvents(create).map((event) => event.changes)).toEqual([["role"]]);
    });

    it("reports nested hidden and read-restricted fields that the saved data changed", async () => {
      const create = await saveAsCaller({
        previousDoc: {
          id: 2,
          profile: { ssn: "s", nested: { pin: "1" } },
          contacts: [{ id: "r1", label: "home", phone: "1" }],
          layout: [{ id: "b1", blockType: "secretive", heading: "h", note: "n" }],
        },
        data: {
          profile: { ssn: "t", nested: { pin: "1" } },
          contacts: [{ id: "r1", label: "home", phone: "2" }],
          layout: [{ id: "b1", blockType: "secretive", heading: "h", note: "m" }],
        },
        doc: {
          id: 2,
          profile: { nested: {} },
          contacts: [{ id: "r1", label: "home" }],
          layout: [{ id: "b1", blockType: "secretive", heading: "h" }],
        },
      });
      expect(firstEvent(create)?.changes).toEqual([
        "profile.ssn",
        "contacts.0.phone",
        "layout.0.note",
      ]);
    });

    it("reports nothing when the saved data leaves hidden and read-restricted fields as stored", async () => {
      const create = await saveAsCaller({
        previousDoc: { id: 2, title: "a", internal: "i", role: "admin", profile: { ssn: "s" } },
        data: { title: "a", internal: "i", role: "admin", profile: { ssn: "s" } },
        doc: { id: 2, title: "a", profile: {} },
      });
      expect(create).not.toHaveBeenCalled();
    });

    it("ignores the hidden fields Payload adds to auth and API key collections", async () => {
      const keyed = audited({
        slug: "users",
        auth: { useAPIKey: true },
        fields: [{ name: "name", type: "text" }],
      });
      const { req, create } = fakeRequest();
      await runUpdate(keyed.hooks, req, {
        previousDoc: { id: 2, name: "a", resetPasswordRequestedAt: "2026-01-01", hasAPIKey: true },
        doc: { id: 2, name: "b" },
        collection: usersCollection,
      });
      expect(firstEvent(create)?.changes).toEqual(["name"]);
    });
  });

  describe("auth events", () => {
    it("records the logged-in user as the actor of auth.login", async () => {
      const { req, create } = fakeRequest({ user: null, payloadAPI: "REST" });
      await runHooks(users.hooks?.afterLogin, {
        user: { id: 9, email: "l@example.com" },
        req,
        collection: usersCollection,
        token: "t",
      });
      expect(firstEvent(create)).toMatchObject({
        action: "auth.login",
        actor: { type: "user", docId: "9", collection: "users", label: "l@example.com" },
        target: { kind: "auth", slug: "users", docId: "9" },
      });
    });

    it("records logout, password reset request and password reset", async () => {
      const { req, create } = fakeRequest();
      await runHooks(users.hooks?.afterLogout, { req, collection: usersCollection });
      await runHooks(users.hooks?.afterForgotPassword, {
        args: { req, data: { email: "f@example.com" } },
        collection: usersCollection,
      });
      await runHooks(users.hooks?.afterOperation, { operation: "login", req, result: {} });
      await runHooks(users.hooks?.afterOperation, {
        operation: "resetPassword",
        req,
        result: { token: "t", user: { id: 4, email: "r@example.com" } },
      });
      const [logout, resetRequested, reset] = recordedEvents(create);
      expect(recordedActions(create)).toEqual([
        "auth.logout",
        "auth.password_reset_requested",
        "auth.password_reset",
      ]);
      expect(logout?.target).toEqual({ kind: "auth", slug: "users", docId: "1" });
      expect(resetRequested?.target).toEqual({
        kind: "auth",
        slug: "users",
        label: "f@example.com",
      });
      expect(reset?.actor).toMatchObject({ type: "user", docId: "4" });
    });

    it("are not hooked into non-auth collections", () => {
      expect(posts.hooks?.afterLogin ?? []).toHaveLength(0);
      expect(posts.hooks?.afterLogout ?? []).toHaveLength(0);
      expect(posts.hooks?.afterForgotPassword ?? []).toHaveLength(0);
      expect(posts.hooks?.afterOperation ?? []).toHaveLength(0);
    });
  });

  describe("saves that select which fields they return", () => {
    const updateSelecting = async (
      hooks: Hooks,
      req: FakeRequest,
      select: Doc,
      change: { previousDoc: Doc; doc: Doc; data?: Doc; collection?: unknown }
    ) => {
      const saveReq = await runBeforeOperation(hooks?.beforeOperation, {
        operation: "update",
        args: { id: change.doc.id, data: {}, select },
        req,
        collection: postsCollection,
      });
      await runUpdate(hooks, saveReq, change);
    };

    it("reports only the selected fields that changed, not the fields left out of the selection", async () => {
      const { req, create } = fakeRequest();
      await updateSelecting(
        posts.hooks,
        req,
        { title: true },
        {
          previousDoc: { id: 1, title: "t", body: "b", seo: { description: "d" } },
          doc: { id: 1, title: "u" },
        }
      );
      expect(firstEvent(create)?.changes).toEqual(["title"]);
    });

    it("compares only the selected part of groups and array rows", async () => {
      const { req, create } = fakeRequest();
      await updateSelecting(
        posts.hooks,
        req,
        { seo: { description: true }, items: { label: true } },
        {
          previousDoc: {
            id: 1,
            seo: { description: "d", keywords: "k" },
            items: [
              { id: "a", label: "x", note: "n" },
              { id: "b", label: "y", note: "m" },
            ],
          },
          doc: { id: 1, seo: { description: "e" }, items: [{ id: "a", label: "z" }] },
        }
      );
      expect(firstEvent(create)?.changes).toEqual(["seo.description", "items.0.label", "items.1"]);
    });

    it("still compares a selected rich text value as a whole", async () => {
      const { req, create } = fakeRequest();
      await updateSelecting(
        posts.hooks,
        req,
        { body: true },
        {
          previousDoc: { id: 1, body: richText([{ text: "a", format: 1 }]) },
          doc: { id: 1, body: richText([{ text: "a" }]) },
        }
      );
      expect(firstEvent(create)?.changes).toEqual(["body"]);
    });

    it("skips a save whose selected fields did not change", async () => {
      const { req, create } = fakeRequest();
      await updateSelecting(
        posts.hooks,
        req,
        { title: true },
        {
          previousDoc: { id: 1, title: "t", body: "b" },
          doc: { id: 1, title: "t" },
        }
      );
      expect(create).not.toHaveBeenCalled();
    });

    it("is no role change when the role is left out of the selection", async () => {
      const { req, create } = fakeRequest();
      await updateSelecting(
        users.hooks,
        req,
        { name: true },
        {
          previousDoc: { id: 2, role: "admin", name: "a" },
          doc: { id: 2, name: "z" },
          collection: usersCollection,
        }
      );
      expect(recordedActions(create)).toEqual(["doc.update"]);
      expect(firstEvent(create)?.changes).toEqual(["name"]);
    });

    it("still reports a selected role that changed", async () => {
      const { req, create } = fakeRequest();
      await updateSelecting(
        users.hooks,
        req,
        { role: true },
        {
          previousDoc: { id: 2, role: "editor", name: "a" },
          doc: { id: 2, role: "admin" },
          collection: usersCollection,
        }
      );
      expect(recordedEvents(create).map((event) => [event.action, event.changes])).toEqual([
        ["doc.update", ["role"]],
      ]);
    });

    it("reports a submitted role change that the selection leaves out", async () => {
      const { req, create } = fakeRequest();
      await updateSelecting(
        users.hooks,
        req,
        { name: true },
        {
          previousDoc: { id: 2, role: "editor", name: "a" },
          data: { role: "admin" },
          doc: { id: 2, name: "a" },
          collection: usersCollection,
        }
      );
      expect(recordedEvents(create).map((event) => [event.action, event.changes])).toEqual([
        ["doc.update", ["role"]],
      ]);
    });

    it("prefers the saved value of a selected field over the submitted one", async () => {
      const { req, create } = fakeRequest();
      await updateSelecting(
        posts.hooks,
        req,
        { title: true },
        {
          previousDoc: { id: 1, title: "T", body: "b" },
          data: { title: "t" },
          doc: { id: 1, title: "T" },
        }
      );
      expect(create).not.toHaveBeenCalled();
    });

    it("merges the submitted part of a group with its selected part", async () => {
      const { req, create } = fakeRequest();
      await updateSelecting(
        posts.hooks,
        req,
        { seo: { description: true } },
        {
          previousDoc: { id: 1, seo: { description: "d", keywords: "k" }, body: "b" },
          data: { seo: { description: "d", keywords: "l" } },
          doc: { id: 1, seo: { description: "d" } },
        }
      );
      expect(firstEvent(create)?.changes).toEqual(["seo.keywords"]);
    });

    it("classifies a submitted publish that the selection leaves out", async () => {
      const { req, create } = fakeRequest();
      await updateSelecting(
        posts.hooks,
        req,
        { title: true },
        {
          previousDoc: { id: 1, title: "t", _status: "draft" },
          data: { _status: "published" },
          doc: { id: 1, title: "t" },
        }
      );
      expect(firstEvent(create)).toMatchObject({ action: "doc.publish", changes: ["_status"] });
    });

    it("reports a submitted API key switch that the selection leaves out", async () => {
      const bots = audited({ slug: "bots", auth: { useAPIKey: true }, fields: [] });
      const { req, create } = fakeRequest();
      await updateSelecting(
        bots.hooks,
        req,
        { name: true },
        {
          previousDoc: { id: 1, enableAPIKey: true, name: "a" },
          data: { enableAPIKey: false },
          doc: { id: 1, name: "a" },
          collection: { slug: "bots" },
        }
      );
      expect(firstEvent(create)).toMatchObject({
        action: "doc.update",
        changes: ["enableAPIKey"],
      });
    });

    it("does not report a submitted field that is not stored", async () => {
      const articles = audited({ slug: "posts", fields: [] });
      const { req, create } = fakeRequest();
      await updateSelecting(
        articles.hooks,
        req,
        { title: true },
        {
          previousDoc: { id: 1, title: "t" },
          data: { title: "t", titleUpper: "T" },
          doc: { id: 1, title: "t" },
          collection: sanitizedCollection("posts", "title"),
        }
      );
      expect(create).not.toHaveBeenCalled();
    });

    it("does not report a submitted read-restricted field the saved document hides", async () => {
      const notes = audited({
        slug: "notes",
        fields: [
          { name: "title", type: "text" },
          { name: "pin", type: "text", access: { read: () => false } },
        ],
      });
      const { req, create } = fakeRequest();
      await updateSelecting(
        notes.hooks,
        req,
        { title: true },
        {
          previousDoc: { id: 1, title: "t" },
          data: { title: "t", pin: "1234" },
          doc: { id: 1, title: "t" },
        }
      );
      expect(create).not.toHaveBeenCalled();
    });

    it("reports the submitted fields of a create that selects which fields it returns", async () => {
      const { req, create } = fakeRequest();
      const data = { title: "t", body: "b" };
      await runHooks(posts.hooks?.beforeOperation, {
        operation: "create",
        args: { data, select: { title: true } },
        req,
        collection: postsCollection,
      });
      await runHooks(posts.hooks?.afterChange, {
        operation: "create",
        data,
        previousDoc: {},
        doc: { id: 1, title: "t" },
        req,
        collection: postsCollection,
      });
      expect(firstEvent(create)?.changes).toEqual(["title", "body"]);
    });

    it("reports a field removed by a save without a selection", async () => {
      const { req: callerReq, create } = fakeRequest();
      const req = await runBeforeOperation(posts.hooks?.beforeOperation, {
        operation: "update",
        args: { id: 1, data: {} },
        req: callerReq,
        collection: postsCollection,
      });
      await runUpdate(posts.hooks, req, {
        previousDoc: { id: 1, title: "t", body: "b" },
        doc: { id: 1, title: "t" },
      });
      expect(firstEvent(create)?.changes).toEqual(["body"]);
    });

    it("applies the selection of a bulk update to every document it changes", async () => {
      const { req: callerReq, create } = fakeRequest();
      const req = await runBeforeOperation(posts.hooks?.beforeOperation, {
        operation: "update",
        args: { where: { id: { in: [1, 2] } }, data: {}, select: { title: true } },
        req: callerReq,
        collection: postsCollection,
      });
      for (const id of [1, 2]) {
        await runHooks(posts.hooks?.beforeChange, {
          operation: "update",
          originalDoc: { id },
          data: {},
          req,
          collection: postsCollection,
        });
        await runUpdate(posts.hooks, req, {
          previousDoc: { id, title: "t", body: "b" },
          doc: { id, title: `t${id}` },
        });
      }
      expect(recordedEvents(create).map((event) => event.changes)).toEqual([["title"], ["title"]]);
    });

    it("diffs a selected publish of an autosave collection against the live document only where the selection has values", async () => {
      const autosavePosts = audited({
        slug: "posts",
        versions: { drafts: { autosave: true } },
        fields: [],
      });
      const { req: callerReq, create, db } = fakeRequest();
      db.findOne = vi
        .fn()
        .mockResolvedValue({ id: 1, title: "t", body: "b", _status: "published" });
      const latestDraft = { id: 1, title: "t", body: "b", _status: "draft" };
      const req = await runBeforeOperation(autosavePosts.hooks?.beforeOperation, {
        operation: "update",
        args: { id: 1, data: { _status: "published" }, select: { title: true, _status: true } },
        req: callerReq,
        collection: postsCollection,
      });
      await runHooks(autosavePosts.hooks?.beforeChange, {
        operation: "update",
        originalDoc: latestDraft,
        data: { _status: "published" },
        req,
        collection: postsCollection,
      });
      captureWrittenDoc(req, "posts", 1, { id: 1, title: "u", body: "b", _status: "published" });
      await runUpdate(autosavePosts.hooks, req, {
        previousDoc: latestDraft,
        doc: { id: 1, title: "u", _status: "published" },
      });
      expect(firstEvent(create)).toMatchObject({ action: "doc.publish", changes: ["title"] });
    });
  });

  describe("keys that are not stored fields", () => {
    const sanitizedUsers = sanitizedCollection("users", "email", "role", "name", "updatedAt");
    const sanitizedPosts = sanitizedCollection("posts", "title", "body", "updatedAt");

    it("does not list the collection key Payload adds to auth documents on create", async () => {
      const { req, create } = fakeRequest();
      await runHooks(users.hooks?.afterChange, {
        operation: "create",
        previousDoc: {},
        doc: { id: 3, email: "n@example.com", role: "editor", collection: "users" },
        req,
        collection: sanitizedUsers,
      });
      expect(firstEvent(create)?.changes).toEqual(["email", "role"]);
    });

    it("does not report a key that a collection afterRead hook adds", async () => {
      const { req, create } = fakeRequest();
      await runUpdate(posts.hooks, req, {
        previousDoc: { id: 1, title: "a" },
        doc: { id: 1, title: "b", readingTime: 4 },
        collection: sanitizedPosts,
      });
      expect(firstEvent(create)?.changes).toEqual(["title"]);
    });

    it("skips a save that changed nothing but a key a collection afterRead hook adds", async () => {
      const { req, create } = fakeRequest();
      await runUpdate(posts.hooks, req, {
        previousDoc: { id: 1, title: "a", readingTime: 3 },
        doc: { id: 1, title: "a", readingTime: 4, titleUpper: "A", collection: "posts" },
        collection: sanitizedPosts,
      });
      expect(create).not.toHaveBeenCalled();
    });
  });

  it("keeps existing hooks first", () => {
    const own = vi.fn();
    const collection = audited({ slug: "x", fields: [], hooks: { afterChange: [own] } });
    expect(collection.hooks?.afterChange?.[0]).toBe(own);
    expect(collection.hooks?.afterChange).toHaveLength(2);
  });
});

describe.each([
  { versions: { drafts: true }, described: "drafts", publishChanges: ["_status"], publishReads: 0 },
  {
    versions: { drafts: { autosave: true } },
    described: "autosave drafts",
    publishChanges: ["role"],
    publishReads: 1,
  },
])(
  "saves over drafts of an auth collection with $described",
  ({ versions, publishChanges, publishReads }) => {
    const contractors = audited({
      slug: "contractors",
      auth: { useAPIKey: true },
      versions,
      fields: [
        { name: "role", type: "text" },
        { name: "name", type: "text" },
      ],
    });
    const contractorsCollection = { slug: "contractors" };
    const liveDoc = { id: 7, role: "editor", enableAPIKey: false, _status: "published" };

    const saveOverLatestDraft = async (
      args: Doc,
      latestDraft: Doc,
      doc: Doc,
      findOne = vi.fn().mockResolvedValue(liveDoc)
    ) => {
      const { req: callerReq, db, create } = fakeRequest();
      db.findOne = findOne;
      const req = await runBeforeOperation(contractors.hooks?.beforeOperation, {
        operation: "update",
        args: { id: 7, ...args },
        req: callerReq,
        collection: contractorsCollection,
      });
      await runHooks(contractors.hooks?.beforeChange, {
        operation: "update",
        originalDoc: latestDraft,
        data: args.data,
        req,
        collection: contractorsCollection,
      });
      await runUpdate(contractors.hooks, req, {
        previousDoc: latestDraft,
        doc,
        data: args.data as Doc,
        collection: contractorsCollection,
      });
      return { actions: recordedActions(create), events: recordedEvents(create), findOne };
    };

    it("records a draft save as doc.update and reads nothing", async () => {
      const { actions, findOne } = await saveOverLatestDraft(
        { data: { role: "admin", enableAPIKey: true }, draft: true },
        liveDoc,
        { ...liveDoc, role: "admin", enableAPIKey: true, _status: "draft" }
      );
      expect(actions).toEqual(["doc.update"]);
      expect(findOne).not.toHaveBeenCalled();
    });

    it("records a publish over a draft as doc.publish, reading the live document only with autosave", async () => {
      const latestDraft = { ...liveDoc, role: "admin", _status: "draft" };
      const { events, findOne } = await saveOverLatestDraft(
        { data: { _status: "published" } },
        latestDraft,
        { ...latestDraft, _status: "published" }
      );
      expect(events.map((event) => [event.action, event.changes])).toEqual([
        ["doc.publish", publishChanges],
      ]);
      expect(findOne).toHaveBeenCalledTimes(publishReads);
    });

    it("records a save that writes the latest draft to the document as doc.unpublish, compared with the live document it reads once", async () => {
      const latestDraft = { ...liveDoc, role: "admin", enableAPIKey: true, _status: "draft" };
      const { events, findOne } = await saveOverLatestDraft(
        { data: { _status: "draft" } },
        latestDraft,
        {
          ...latestDraft,
          name: "renamed",
        }
      );
      expect(events.map((event) => [event.action, event.changes])).toEqual([
        ["doc.unpublish", ["role", "enableAPIKey", "_status", "name"]],
      ]);
      expect(findOne).toHaveBeenCalledTimes(1);
    });

    it("does not read the live document for a publish over a published latest version", async () => {
      const { actions, findOne } = await saveOverLatestDraft(
        { data: { role: "admin", _status: "published" } },
        liveDoc,
        { ...liveDoc, role: "admin" }
      );
      expect(actions).toEqual(["doc.update"]);
      expect(findOne).not.toHaveBeenCalled();
    });

    it("compares with the latest draft when reading the live document fails", async () => {
      const latestDraft = { ...liveDoc, role: "admin", _status: "draft" };
      const { actions } = await saveOverLatestDraft(
        { data: { _status: "published" } },
        latestDraft,
        { ...latestDraft, _status: "published" },
        vi.fn().mockRejectedValue(new Error("db down"))
      );
      expect(actions).toEqual(["doc.publish"]);
    });
  }
);

const hero = {
  slug: "hero",
  fields: [{ name: "heading", type: "text" as const, localized: true }],
};

describe.each([
  {
    described: "inline blocks",
    collection: {
      slug: "posts",
      fields: [
        { name: "code", type: "text" },
        { name: "layout", type: "blocks", blocks: [hero] },
      ],
    } satisfies CollectionConfig,
  },
  {
    described: "blocks referenced from the config",
    collection: {
      slug: "posts",
      fields: [
        { name: "code", type: "text" },
        { name: "layout", type: "blocks", blocks: [], blockReferences: ["hero"] },
      ],
    } satisfies CollectionConfig,
  },
])("a collection whose only localized fields live in $described", ({ collection }) => {
  const layoutPosts = withCollectionAudit(collection, normalizeOptions(), [hero]);

  const saveInGerman = async (change: { previousDoc: Doc; data: Doc; written: Doc; doc: Doc }) => {
    const { req: callerReq, create } = fakeRequest({ locale: "de", fallbackLocale: "en" });
    const req = await runBeforeOperation(layoutPosts.hooks?.beforeOperation, {
      operation: "update",
      args: { id: 1, data: change.data },
      req: callerReq,
      collection: postsCollection,
    });
    await runHooks(layoutPosts.hooks?.beforeChange, {
      operation: "update",
      originalDoc: change.previousDoc,
      data: change.data,
      req,
      collection: postsCollection,
    });
    captureWrittenDoc(req, "posts", 1, change.written);
    await runUpdate(layoutPosts.hooks, req, change);
    return create;
  };

  it("records the locale of the save and leaves out the fallback values of the blocks", async () => {
    const create = await saveInGerman({
      previousDoc: { id: 1, code: "c", layout: [{ id: "b1", blockType: "hero", heading: null }] },
      data: { code: "x" },
      written: {
        id: 1,
        code: "x",
        layout: [{ id: "b1", blockType: "hero", heading: { en: "Hello" } }],
      },
      doc: { id: 1, code: "x", layout: [{ id: "b1", blockType: "hero", heading: "Hello" }] },
    });
    expect(firstEvent(create)).toMatchObject({
      target: { slug: "posts", docId: "1", locale: "de" },
      changes: ["code"],
    });
  });
});
