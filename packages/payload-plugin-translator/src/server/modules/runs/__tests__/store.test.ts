import { describe, it, expect, vi } from "vitest";
import type { Payload } from "payload";

import { PayloadRunRecordStore } from "../RunRecord.store.js";
import type { RunIdentity, RunRecord } from "../RunRecord.types.js";

const SLUG = "translator-runs";

const identity = (over: Partial<RunIdentity> = {}): RunIdentity => ({
  handle: "job-1",
  collectionSlug: "posts" as RunRecord["collectionSlug"],
  collectionId: "d1",
  sourceLng: "en",
  targetLng: "de",
  filters: null,
  publishOnTranslation: false,
  requesterId: null,
  requesterCollection: null,
  queuedAt: "2026-10-26T10:00:00.000Z",
  ...over,
});

const record = (over: Partial<RunRecord> = {}): RunRecord => ({
  ...identity(),
  startedAt: null,
  settledAt: null,
  outcome: null,
  error: null,
  attempts: null,
  ...over,
});

const theKey = { handle: "job-1", targetLng: "de" };
const KEY_WHERE = { and: [{ handle: { equals: "job-1" } }, { targetLng: { equals: "de" } }] };

const payloadWith = (over: Partial<Record<"find" | "create" | "update" | "delete", unknown>>) => {
  const spies = {
    find: vi.fn().mockResolvedValue({ docs: [] }),
    create: vi.fn().mockResolvedValue({ id: "row-1" }),
    update: vi.fn().mockResolvedValue({ docs: [{ id: "row-1" }] }),
    delete: vi.fn().mockResolvedValue({ docs: [] }),
    ...over,
  };
  return { payload: spies as unknown as Payload, spies };
};

describe("the run record store", () => {
  describe("recording that a locale is queued", () => {
    it("creates a row when the key names nothing yet, with no progress on it", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG).recordQueued(identity());

      expect(spies.create).toHaveBeenCalledTimes(1);
      expect(spies.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            handle: "job-1",
            startedAt: null,
            settledAt: null,
            outcome: null,
            error: null,
            attempts: null,
          }),
        })
      );
    });

    it("leaves a key already recorded exactly as it stands", async () => {
      const { payload, spies } = payloadWith({
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: "row-9",
              collectionSlug: "posts",
              collectionId: "d1",
              startedAt: "2026-10-26T10:01:00.000Z",
            },
          ],
        }),
      });

      await new PayloadRunRecordStore(payload, SLUG).recordQueued(identity());

      expect(spies.create, "an existing row is not replaced").not.toHaveBeenCalled();
      expect(spies.update, "nor patched back to empty").not.toHaveBeenCalled();
    });

    it("replaces a row whose key names a different document, because the handle came round again", async () => {
      const { payload, spies } = payloadWith({
        find: vi.fn().mockResolvedValue({
          docs: [{ id: "row-9", collectionSlug: "posts", collectionId: "an-older-document" }],
        }),
      });

      await new PayloadRunRecordStore(payload, SLUG).recordQueued(identity());

      expect(
        spies.update,
        "a SQL store hands a deleted job's id back out, and an adopted run is named by it"
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "row-9",
          data: expect.objectContaining({ collectionId: "d1", startedAt: null }),
        })
      );
    });

    it("names a row by handle and target locale together, never by handle alone", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG).recordQueued(identity());

      expect(spies.find).toHaveBeenCalledWith(expect.objectContaining({ where: KEY_WHERE }));
    });

    it("lets the winner's row stand when another writer took the key first", async () => {
      const find = vi
        .fn()
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [{ id: "theirs" }] });
      const { payload, spies } = payloadWith({
        find,
        create: vi.fn().mockRejectedValue(new Error("duplicate key")),
      });

      await new PayloadRunRecordStore(payload, SLUG).recordQueued(identity());

      expect(
        spies.update,
        "the winner wrote the same identity we would have"
      ).not.toHaveBeenCalled();
    });

    it("gives up loudly when the create failed for a reason that is not a lost race", async () => {
      const boom = new Error("disk is full");
      const { payload } = payloadWith({ create: vi.fn().mockRejectedValue(boom) });

      await expect(new PayloadRunRecordStore(payload, SLUG).recordQueued(identity())).rejects.toBe(
        boom
      );
    });

    it("joins the caller's transaction, so a rolled-back save takes the row with it", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG, { transactionID: "tx-1" }).recordQueued(
        identity()
      );

      expect(spies.create).toHaveBeenCalledWith(
        expect.objectContaining({ req: { transactionID: "tx-1" } })
      );
    });
  });

  describe("stamping and settling", () => {
    it("stamps the start against the key alone, creating nothing", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG).recordStarted(theKey, {
        startedAt: "2026-10-26T10:01:00.000Z",
        attempts: 1,
      });

      expect(spies.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: KEY_WHERE,
          data: { startedAt: "2026-10-26T10:01:00.000Z", attempts: 1 },
        })
      );
      expect(
        spies.create,
        "a locale nobody queued gets no row from a stamp"
      ).not.toHaveBeenCalled();
    });

    it("settles against the key alone, so the run's other locales are untouched", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG).recordSettled(theKey, {
        settledAt: "2026-10-26T10:02:00.000Z",
        outcome: "failed",
        error: "it broke",
      });

      expect(spies.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: KEY_WHERE,
          data: { settledAt: "2026-10-26T10:02:00.000Z", outcome: "failed", error: "it broke" },
        })
      );
    });

    it("settles again over a row already settled, because the later report is what happened", async () => {
      const { payload, spies } = payloadWith({
        find: vi.fn().mockResolvedValue({ docs: [{ id: "row-1", outcome: "cancelled" }] }),
      });

      await new PayloadRunRecordStore(payload, SLUG).recordSettled(theKey, {
        settledAt: "2026-10-26T10:03:00.000Z",
        outcome: "delivered",
        error: null,
      });

      expect(spies.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ outcome: "delivered" }) })
      );
    });

    it("joins the caller's transaction when settling", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG, { transactionID: "tx-2" }).recordSettled(
        theKey,
        { settledAt: "2026-10-26T10:02:00.000Z", outcome: "delivered", error: null }
      );

      expect(spies.update).toHaveBeenCalledWith(
        expect.objectContaining({ req: { transactionID: "tx-2" } })
      );
    });
  });

  describe("reading a document's rows", () => {
    it("asks about a document by collection and id together", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG).findByDocument({
        collectionSlug: "posts" as RunRecord["collectionSlug"],
        collectionId: "d1",
      });

      expect(spies.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            and: [{ collectionSlug: { equals: "posts" } }, { collectionId: { equals: "d1" } }],
          },
        })
      );
    });

    it("reads a row back as the record that was stored", async () => {
      const stored = record({ outcome: "delivered", settledAt: "2026-10-26T10:05:00.000Z" });
      const { payload } = payloadWith({
        find: vi.fn().mockResolvedValue({ docs: [{ id: "row-1", ...stored }] }),
      });

      const [found] = await new PayloadRunRecordStore(payload, SLUG).findByDocument({
        collectionSlug: "posts" as RunRecord["collectionSlug"],
        collectionId: "d1",
      });

      expect(found).toMatchObject({ handle: "job-1", targetLng: "de", outcome: "delivered" });
    });
  });

  describe("reading what a run or a collection holds", () => {
    it("asks about several handles in one question", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG).findByHandles(["a", "b"]);

      expect(spies.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { handle: { in: ["a", "b"] } } })
      );
    });

    it("asks nothing at all when no handle was named", async () => {
      const { payload, spies } = payloadWith({});

      const found = await new PayloadRunRecordStore(payload, SLUG).findByHandles([]);

      expect(found).toEqual([]);
      expect(spies.find).not.toHaveBeenCalled();
    });

    it("answers with no row for a handle nothing holds, rather than an invented one", async () => {
      const { payload } = payloadWith({
        find: vi
          .fn()
          .mockResolvedValue({ docs: [{ id: "row-1", ...record({ handle: "known" }) }] }),
      });

      const found = await new PayloadRunRecordStore(payload, SLUG).findByHandles([
        "known",
        "a-stranger",
      ]);

      expect(found.map((row) => row.handle)).toEqual(["known"]);
    });

    it("asks for a collection's work in flight by the absence of a settlement", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG).findLiveInCollection(
        "posts" as RunRecord["collectionSlug"]
      );

      expect(spies.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            and: [{ collectionSlug: { equals: "posts" } }, { settledAt: { exists: false } }],
          },
        })
      );
    });

    it("asks about named documents by both halves of the key and the absence of a settlement", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG).findLiveForDocuments(
        "posts" as RunRecord["collectionSlug"],
        ["d1", "d2"]
      );

      expect(spies.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            and: [
              { collectionSlug: { equals: "posts" } },
              { collectionId: { in: ["d1", "d2"] } },
              { settledAt: { exists: false } },
            ],
          },
        })
      );
    });

    it("asks nothing at all when no document was named", async () => {
      const { payload, spies } = payloadWith({});

      const found = await new PayloadRunRecordStore(payload, SLUG).findLiveForDocuments(
        "posts" as RunRecord["collectionSlug"],
        []
      );

      expect(found).toEqual([]);
      expect(spies.find).not.toHaveBeenCalled();
    });

    it("asks for a collection's recent failures by outcome and moment", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG).findRecentlyFailedInCollection(
        "posts" as RunRecord["collectionSlug"],
        new Date("2026-10-20T00:00:00.000Z")
      );

      expect(spies.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            and: [
              { collectionSlug: { equals: "posts" } },
              { outcome: { equals: "failed" } },
              { settledAt: { greater_than: "2026-10-20T00:00:00.000Z" } },
            ],
          },
        })
      );
    });

    it("bounds every read, because nothing prunes the rows", async () => {
      const find = vi.fn().mockResolvedValue({ docs: [] });
      const { payload } = payloadWith({ find });
      const store = new PayloadRunRecordStore(payload, SLUG);

      await store.findLiveInCollection("posts" as RunRecord["collectionSlug"]);
      await store.findByDocument({
        collectionSlug: "posts" as RunRecord["collectionSlug"],
        collectionId: "d1",
      });

      for (const [asked] of find.mock.calls) {
        expect(asked.limit, "a read with no limit grows with the table").toBeGreaterThan(0);
        expect(asked.pagination, "and pagination off with no limit is unbounded").not.toBe(false);
      }
    });

    it("names the order every bounded read keeps, so the rows it drops are the oldest", async () => {
      const find = vi.fn().mockResolvedValue({ docs: [] });
      const { payload } = payloadWith({ find });
      const store = new PayloadRunRecordStore(payload, SLUG);

      await store.findLiveInCollection("posts" as RunRecord["collectionSlug"]);
      await store.findByDocument({
        collectionSlug: "posts" as RunRecord["collectionSlug"],
        collectionId: "d1",
      });

      for (const [asked] of find.mock.calls) {
        expect(
          asked.sort,
          "a limit with no order keeps an arbitrary page, so a busy collection hides its newest runs"
        ).toBe("-queuedAt");
      }
    });
  });

  describe("deleting a document's rows", () => {
    it("stays outside the caller's transaction, so a failed cleanup cannot undo their delete", async () => {
      const { payload, spies } = payloadWith({});

      await new PayloadRunRecordStore(payload, SLUG, { transactionID: "tx-1" }).deleteByDocument({
        collectionSlug: "posts" as RunRecord["collectionSlug"],
        collectionId: "d1",
      });

      expect(spies.delete).toHaveBeenCalledWith(
        expect.not.objectContaining({ req: expect.anything() })
      );
    });
  });
});
