import { commitTransaction, createLocalReq, initTransaction } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  auditErrorMessages,
  bootAuditPayload,
  dbAdapterName,
  mentionsAbortedTransaction,
  POST_HOOK_FLAGS,
  targetActions,
  targetEvents,
  timestampAfterEverythingSoFar,
  withAuditInsertsBlocked,
} from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

const canBlockAuditInsertsWithSql = dbAdapterName() !== "mongo";

let ctx: AuditTestPayload;
beforeAll(async () => {
  ctx = await bootAuditPayload({ enableSqliteTransactions: true });
});
afterAll(async () => {
  await ctx?.cleanup();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const POSTS = "posts" as never;

type ReadQuery = { collection?: string; req?: { transactionID?: unknown } };

const isLivePageLookup = (args: ReadQuery) =>
  args.collection === "pages" && args.req?.transactionID !== undefined;

const createPost = (title: string) =>
  ctx.payload.create({ collection: POSTS, data: { title } as never });

const readPost = async (id: unknown) =>
  (await ctx.payload.findByID({ collection: POSTS, id: id as string })) as {
    title?: string;
    seo?: { description?: string };
  };

const titled = (prefix: string) => ({ title: { like: `${prefix}-` } }) as never;

const postActions = (id: unknown, occurredSince?: string) =>
  targetActions(ctx.payload, "posts", id, occurredSince);

describe.runIf(canBlockAuditInsertsWithSql)(
  "audit writes fail open, inside the change's transaction",
  () => {
    it("an update commits the change and exactly one audit row", async () => {
      const doc = await createPost("H1");
      await ctx.payload.update({ collection: POSTS, id: doc.id, data: { title: "H2" } as never });
      expect((await readPost(doc.id)).title).toBe("H2");
      expect(await postActions(doc.id)).toEqual(["doc.create", "doc.update"]);
    });

    it("a failing audit insert does not fail the change, is logged, and leaves the transaction usable", async () => {
      const doc = await createPost("F1");
      const errorLog = vi.spyOn(ctx.payload.logger, "error");

      await expect(
        withAuditInsertsBlocked(ctx.payload, () =>
          ctx.payload.update({ collection: POSTS, id: doc.id, data: { title: "F2" } as never })
        )
      ).resolves.toBeDefined();

      expect((await readPost(doc.id)).title).toBe("F2");
      expect(await postActions(doc.id)).toEqual(["doc.create"]);
      expect(auditErrorMessages(errorLog).length).toBeGreaterThan(0);
      expect(mentionsAbortedTransaction(errorLog)).toBe(false);
    });

    it("a hook failing after the audit write rolls back both the change and the audit row", async () => {
      const doc = await createPost("A1");
      await expect(
        ctx.payload.update({
          collection: POSTS,
          id: doc.id,
          data: { title: "A2" } as never,
          context: { [POST_HOOK_FLAGS.throwAfterAuditWrite]: true },
        })
      ).rejects.toThrow("project hook failed");
      expect((await readPost(doc.id)).title).toBe("A1");
      expect(await postActions(doc.id)).toEqual(["doc.create"]);
    });

    it("two writes in one transaction keep both audit rows", async () => {
      const req = await createLocalReq({}, ctx.payload);
      await initTransaction(req);
      const doc = await ctx.payload.create({
        collection: POSTS,
        data: { title: "T1" } as never,
        req,
      });
      await ctx.payload.update({
        collection: POSTS,
        id: doc.id,
        data: { title: "T2" } as never,
        req,
      });
      await commitTransaction(req);
      expect(await postActions(doc.id)).toEqual(["doc.create", "doc.update"]);
    });

    describe("a transaction managed by the caller", () => {
      const updateInCallersTransaction = async (prefix: string, end: "commit" | "rollback") => {
        const doc = await createPost(`${prefix}-0`);
        const updatedSince = await timestampAfterEverythingSoFar();
        const transactionID = await ctx.payload.db.beginTransaction();
        if (!transactionID) throw new Error("the adapter did not start a transaction");
        await ctx.payload.update({
          collection: POSTS,
          id: doc.id,
          data: { title: `${prefix}-1` } as never,
          req: { transactionID },
        });
        if (end === "commit") await ctx.payload.db.commitTransaction(transactionID);
        else await ctx.payload.db.rollbackTransaction(transactionID);
        return { doc, updatedSince };
      };

      it("writes the audit row when the caller commits", async () => {
        const { doc, updatedSince } = await updateInCallersTransaction("UC", "commit");
        expect((await readPost(doc.id)).title).toBe("UC-1");
        expect(await postActions(doc.id, updatedSince)).toEqual(["doc.update"]);
      });

      it("drops the audit row when the caller rolls back", async () => {
        const { doc, updatedSince } = await updateInCallersTransaction("UR", "rollback");
        expect((await readPost(doc.id)).title).toBe("UR-0");
        expect(await postActions(doc.id, updatedSince)).toEqual([]);
      });
    });

    describe("bulk operations, which run every document in parallel on one transaction", () => {
      const createFourPosts = async (prefix: string) => {
        const ids: (string | number)[] = [];
        for (let i = 0; i < 4; i += 1) {
          ids.push((await createPost(`${prefix}-${i}`)).id);
        }
        return { ids, bulkStartedAt: await timestampAfterEverythingSoFar() };
      };
      const actionsPerPost = (ids: unknown[], occurredSince: string) =>
        Promise.all(ids.map((id) => postActions(id, occurredSince)));
      const setSeoDescription = (prefix: string, description: string) =>
        ctx.payload.update({
          collection: POSTS,
          where: titled(prefix),
          data: { seo: { description } } as never,
        });
      const expectSeoDescriptionOnAll = async (ids: unknown[], description: string) => {
        for (const id of ids) {
          expect((await readPost(id)).seo?.description).toBe(description);
        }
      };

      it("a bulk update commits every change and one audit row per document", async () => {
        const { ids, bulkStartedAt } = await createFourPosts("BU");
        const errorLog = vi.spyOn(ctx.payload.logger, "error");

        const res = await setSeoDescription("BU", "bulk");

        expect(res.errors).toEqual([]);
        expect(res.docs).toHaveLength(ids.length);
        expect(await actionsPerPost(ids, bulkStartedAt)).toEqual(ids.map(() => ["doc.update"]));
        expect(auditErrorMessages(errorLog)).toEqual([]);
      });

      it("a bulk delete removes every document and writes one audit row per document", async () => {
        const { ids, bulkStartedAt } = await createFourPosts("BD");

        const res = await ctx.payload.delete({ collection: POSTS, where: titled("BD") });

        expect(res.errors).toEqual([]);
        expect(res.docs).toHaveLength(ids.length);
        expect(await actionsPerPost(ids, bulkStartedAt)).toEqual(ids.map(() => ["doc.delete"]));
      });

      it("a bulk update with blocked audit inserts still commits every change", async () => {
        const { ids, bulkStartedAt } = await createFourPosts("BX");
        const errorLog = vi.spyOn(ctx.payload.logger, "error");

        const res = await withAuditInsertsBlocked(ctx.payload, () =>
          setSeoDescription("BX", "blocked")
        );

        expect(res.errors).toEqual([]);
        await expectSeoDescriptionOnAll(ids, "blocked");
        expect(await actionsPerPost(ids, bulkStartedAt)).toEqual(ids.map(() => []));
        expect(auditErrorMessages(errorLog).length).toBeGreaterThan(0);
        expect(mentionsAbortedTransaction(errorLog)).toBe(false);
      });

      it("a bulk update where one document's audit insert fails keeps every change and the other rows", async () => {
        const { ids, bulkStartedAt } = await createFourPosts("BP");
        const [blockedId, ...otherIds] = ids;
        const errorLog = vi.spyOn(ctx.payload.logger, "error");

        const res = await withAuditInsertsBlocked(
          ctx.payload,
          () => setSeoDescription("BP", "partial"),
          { onlyForDocId: blockedId }
        );

        expect(res.errors).toEqual([]);
        await expectSeoDescriptionOnAll(ids, "partial");
        expect(await actionsPerPost([blockedId], bulkStartedAt)).toEqual([[]]);
        expect(await actionsPerPost(otherIds, bulkStartedAt)).toEqual(
          otherIds.map(() => ["doc.update"])
        );
        expect(auditErrorMessages(errorLog).length).toBeGreaterThan(0);
        expect(mentionsAbortedTransaction(errorLog)).toBe(false);
      });

      it("a bulk delete with blocked audit inserts still deletes every document", async () => {
        const { ids, bulkStartedAt } = await createFourPosts("BY");

        const res = await withAuditInsertsBlocked(ctx.payload, () =>
          ctx.payload.delete({ collection: POSTS, where: titled("BY") })
        );

        expect(res.errors).toEqual([]);
        expect((await ctx.payload.find({ collection: POSTS, where: titled("BY") })).totalDocs).toBe(
          0
        );
        expect(await actionsPerPost(ids, bulkStartedAt)).toEqual(ids.map(() => []));
      });
    });

    describe("audit reads inside the change's transaction", () => {
      const failInsideTransaction = async (args: ReadQuery) => {
        const db = ctx.payload.db as unknown as {
          sessions: Record<string, { db: unknown }>;
          execute: (args: { db: unknown; raw: string }) => Promise<unknown>;
        };
        const session = db.sessions[String(await args.req?.transactionID)];
        await db.execute({ db: session?.db, raw: 'SELECT * FROM "audit_read_no_such_table"' });
      };

      it("a failing live document read does not abort the transaction: the publish commits, the event falls back, the error is logged", async () => {
        const page = await ctx.payload.create({
          collection: "pages" as never,
          data: { title: "R1" } as never,
          draft: true,
        });
        const errorLog = vi.spyOn(ctx.payload.logger, "error");
        const findOne = ctx.payload.db.findOne.bind(ctx.payload.db);
        let forcedFailures = 0;
        vi.spyOn(ctx.payload.db, "findOne").mockImplementation(async (args) => {
          if (isLivePageLookup(args as ReadQuery)) {
            forcedFailures += 1;
            await failInsideTransaction(args as ReadQuery);
          }
          return findOne(args);
        });

        await ctx.payload.update({
          collection: "pages" as never,
          id: page.id,
          data: { title: "R2", _status: "published" } as never,
        });

        expect(forcedFailures).toBe(1);
        const published = (await ctx.payload.findByID({
          collection: "pages" as never,
          id: page.id,
        })) as { title?: string; _status?: string };
        expect(published).toMatchObject({ title: "R2", _status: "published" });
        const events = await targetEvents(ctx.payload, "pages", page.id);
        expect(events.map((event) => event.action)).toEqual(["doc.create", "doc.publish"]);
        expect(auditErrorMessages(errorLog)).toContain(
          "[payload-plugin-audit-log] reading the live document failed"
        );
        expect(mentionsAbortedTransaction(errorLog)).toBe(false);
      });
    });
  }
);
