import { describe, expect, it, vi } from "vitest";
import { bufferAuditWritesUntilCommandEnds } from "../../src/core/commandWriteBuffer";
import {
  deferAuditWritesToCommit,
  readForAudit,
  writeCommandEventsOnceCommitted,
} from "../../src/core/failOpenInsert";
import { isActive, markActive } from "../../src/core/requestState";
import { writeAuditEvent } from "../../src/core/writeEvent";

const event = {
  occurredAt: "t",
  action: "doc.update" as const,
  status: "success" as const,
  actor: { type: "system" as const, source: "inferred" as const },
  via: "local" as const,
  target: { kind: "collection" as const, slug: "posts", docId: "1" },
};

function sqlPayload(createImpl: () => Promise<unknown>) {
  const calls: string[] = [];
  const tx = { name: "tx-handle" };
  const execute = vi.fn(async ({ raw }: { db: unknown; raw: string }) => {
    calls.push(raw.split(" audit_")[0] as string);
    return undefined;
  });
  const create = vi.fn(async () => {
    calls.push("CREATE");
    return createImpl();
  });
  const error = vi.fn();
  const sessions: Record<string, { db: unknown } | undefined> = { "tx-1": { db: tx } };
  const commitTransaction = vi.fn(async function commit(this: unknown, id: unknown) {
    const key = String(await id);
    calls.push(sessions[key] ? "COMMIT" : "COMMIT (no session)");
    sessions[key] = undefined;
  });
  const rollbackTransaction = vi.fn(async (id: unknown) => {
    calls.push("ROLLBACK");
    sessions[String(await id)] = undefined;
  });
  const db = { create, execute, sessions, commitTransaction, rollbackTransaction };
  const payload = { db, logger: { error } };
  return { calls, create, db, error, execute, payload: payload as never, tx };
}

describe("writeAuditEvent on SQL adapters inside a transaction", () => {
  const req = { context: {}, transactionID: Promise.resolve("tx-1") };

  it("wraps the insert in SAVEPOINT / RELEASE on the transaction connection", async () => {
    const f = sqlPayload(async () => ({}));
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    expect(f.calls).toEqual(["SAVEPOINT", "CREATE", "RELEASE SAVEPOINT"]);
    for (const [args] of f.execute.mock.calls) expect(args.db).toBe(f.tx);
    const names = f.execute.mock.calls.map(([a]) => a.raw.split(" ").pop());
    expect(new Set(names).size).toBe(1);
    expect(names[0]).toMatch(/^audit_[a-z0-9_]+$/u);
    expect(f.error).not.toHaveBeenCalled();
  });

  it("uses a different savepoint name on each call", async () => {
    const f = sqlPayload(async () => ({}));
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    const first = f.execute.mock.calls[0]?.[0].raw;
    const second = f.execute.mock.calls[2]?.[0].raw;
    expect(first).not.toBe(second);
  });

  it("rolls back to the savepoint, logs and resolves when the insert fails", async () => {
    const f = sqlPayload(async () => {
      throw new Error("column does not exist");
    });
    await expect(
      writeAuditEvent(f.payload, "audit-events", event, req as never)
    ).resolves.toBeUndefined();
    expect(f.calls).toEqual(["SAVEPOINT", "CREATE", "ROLLBACK TO SAVEPOINT", "RELEASE SAVEPOINT"]);
    expect(f.error).toHaveBeenCalledTimes(1);
    const [logArg] = f.error.mock.calls[0] as [{ err: Error; msg: string }];
    expect(logArg.msg).toMatch(/^\[payload-plugin-audit-log\]/u);
    expect(logArg.err.message).toBe("column does not exist");
  });

  it("does not insert and does not throw when SAVEPOINT itself fails", async () => {
    const f = sqlPayload(async () => ({}));
    f.execute.mockRejectedValueOnce(new Error("current transaction is aborted"));
    await expect(
      writeAuditEvent(f.payload, "audit-events", event, req as never)
    ).resolves.toBeUndefined();
    expect(f.create).not.toHaveBeenCalled();
    expect(f.error).toHaveBeenCalled();
  });

  it("still resolves when the rollback cleanup fails too", async () => {
    const f = sqlPayload(async () => {
      throw new Error("insert failed");
    });
    f.execute.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("rollback failed"));
    await expect(
      writeAuditEvent(f.payload, "audit-events", event, req as never)
    ).resolves.toBeUndefined();
    expect(f.error).toHaveBeenCalledTimes(2);
  });
});

describe("writeAuditEvent without a transaction", () => {
  it("inserts without savepoints when req has no transactionID", async () => {
    const f = sqlPayload(async () => ({}));
    await writeAuditEvent(f.payload, "audit-events", event, { context: {} } as never);
    expect(f.execute).not.toHaveBeenCalled();
    expect(f.create).toHaveBeenCalledTimes(1);
  });

  it("inserts without savepoints when the transaction session is gone", async () => {
    const f = sqlPayload(async () => ({}));
    const req = { context: {}, transactionID: "missing" };
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    expect(f.execute).not.toHaveBeenCalled();
    expect(f.create).toHaveBeenCalledTimes(1);
  });

  it("logs and resolves when the insert fails", async () => {
    const f = sqlPayload(async () => {
      throw new Error("boom");
    });
    await expect(writeAuditEvent(f.payload, "audit-events", event)).resolves.toBeUndefined();
    expect(f.execute).not.toHaveBeenCalled();
    expect(f.error).toHaveBeenCalledTimes(1);
  });
});

describe("serialized writes inside one transaction (commit deferral not installed)", () => {
  it("never interleaves the savepoints of concurrent writes on one transaction", async () => {
    const f = sqlPayload(() => new Promise((resolve) => setTimeout(() => resolve({}), 5)));
    const req = { context: {}, transactionID: Promise.resolve("tx-1") };
    await Promise.all([
      writeAuditEvent(f.payload, "audit-events", event, req as never),
      writeAuditEvent(f.payload, "audit-events", event, req as never),
      writeAuditEvent(f.payload, "audit-events", event, req as never),
    ]);
    expect(f.calls).toEqual([
      "SAVEPOINT",
      "CREATE",
      "RELEASE SAVEPOINT",
      "SAVEPOINT",
      "CREATE",
      "RELEASE SAVEPOINT",
      "SAVEPOINT",
      "CREATE",
      "RELEASE SAVEPOINT",
    ]);
  });

  it("keeps the chain going after a failed write", async () => {
    let n = 0;
    const f = sqlPayload(async () => {
      n += 1;
      if (n === 1) throw new Error("first fails");
      return {};
    });
    const req = { context: {}, transactionID: "tx-1" };
    await Promise.all([
      writeAuditEvent(f.payload, "audit-events", event, req as never),
      writeAuditEvent(f.payload, "audit-events", event, req as never),
    ]);
    expect(f.calls).toEqual([
      "SAVEPOINT",
      "CREATE",
      "ROLLBACK TO SAVEPOINT",
      "RELEASE SAVEPOINT",
      "SAVEPOINT",
      "CREATE",
      "RELEASE SAVEPOINT",
    ]);
  });
});

describe("deferAuditWritesToCommit", () => {
  const req = { context: {}, transactionID: Promise.resolve("tx-1") };

  it("queues writes made in a transaction and inserts them in one savepoint before COMMIT", async () => {
    const f = sqlPayload(async () => ({}));
    deferAuditWritesToCommit(f.payload);
    await Promise.all([
      writeAuditEvent(f.payload, "audit-events", event, req as never),
      writeAuditEvent(f.payload, "audit-events", event, req as never),
    ]);
    expect(f.calls).toEqual([]);
    await (f.db.commitTransaction as (id: unknown) => Promise<void>)(req.transactionID);
    expect(f.calls).toEqual(["SAVEPOINT", "CREATE", "CREATE", "RELEASE SAVEPOINT", "COMMIT"]);
    for (const [args] of f.execute.mock.calls) expect(args.db).toBe(f.tx);
    expect(f.error).not.toHaveBeenCalled();
  });

  it("drops the queued writes when the transaction is rolled back", async () => {
    const f = sqlPayload(async () => ({}));
    deferAuditWritesToCommit(f.payload);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    await (f.db.rollbackTransaction as (id: unknown) => Promise<void>)("tx-1");
    expect(f.calls).toEqual(["ROLLBACK"]);
    expect(f.create).not.toHaveBeenCalled();
  });

  it("retries one by one when the batch fails, so one bad event does not drop the others", async () => {
    const insertsOfTheBadEvent = new Set([2, 4]);
    let n = 0;
    const f = sqlPayload(async () => {
      n += 1;
      if (insertsOfTheBadEvent.has(n)) throw new Error("bad event");
      return {};
    });
    deferAuditWritesToCommit(f.payload);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    await (f.db.commitTransaction as (id: unknown) => Promise<void>)("tx-1");
    expect(f.calls).toEqual([
      "SAVEPOINT",
      "CREATE",
      "CREATE",
      "ROLLBACK TO SAVEPOINT",
      "RELEASE SAVEPOINT",
      "SAVEPOINT",
      "CREATE",
      "RELEASE SAVEPOINT",
      "SAVEPOINT",
      "CREATE",
      "ROLLBACK TO SAVEPOINT",
      "RELEASE SAVEPOINT",
      "COMMIT",
    ]);
    expect(f.error).toHaveBeenCalledTimes(1);
  });

  it("still commits when the flush cannot even open its savepoint", async () => {
    const f = sqlPayload(async () => ({}));
    deferAuditWritesToCommit(f.payload);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    f.execute.mockRejectedValueOnce(new Error("connection lost"));
    await (f.db.commitTransaction as (id: unknown) => Promise<void>)("tx-1");
    expect(f.calls.at(-1)).toBe("COMMIT");
    expect(f.create).not.toHaveBeenCalled();
    expect(f.error).toHaveBeenCalledTimes(1);
  });

  it("passes commits without queued events straight through", async () => {
    const f = sqlPayload(async () => ({}));
    deferAuditWritesToCommit(f.payload);
    await (f.db.commitTransaction as (id: unknown) => Promise<void>)("tx-1");
    await (f.db.commitTransaction as (id: unknown) => Promise<void>)("unknown");
    expect(f.calls).toEqual(["COMMIT", "COMMIT (no session)"]);
    expect(f.execute).not.toHaveBeenCalled();
  });

  it("writes immediately when there is no transaction", async () => {
    const f = sqlPayload(async () => ({}));
    deferAuditWritesToCommit(f.payload);
    await writeAuditEvent(f.payload, "audit-events", event, { context: {} } as never);
    expect(f.calls).toEqual(["CREATE"]);
  });

  it("wraps the adapter once", async () => {
    const f = sqlPayload(async () => ({}));
    deferAuditWritesToCommit(f.payload);
    const commit = f.db.commitTransaction;
    deferAuditWritesToCommit(f.payload);
    expect(f.db.commitTransaction).toBe(commit);
  });
});

const commitOf = (f: ReturnType<typeof sqlPayload>) =>
  f.db.commitTransaction as (id: unknown) => Promise<void>;

describe("deferAuditWritesToCommit: transaction id and queue edge cases", () => {
  const req = { context: {}, transactionID: Promise.resolve("tx-1") };

  it("flushes the queue when commitTransaction receives the transaction id as a Promise", async () => {
    const f = sqlPayload(async () => ({}));
    deferAuditWritesToCommit(f.payload);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    await commitOf(f)(Promise.resolve("tx-1"));
    expect(f.calls).toEqual(["SAVEPOINT", "CREATE", "RELEASE SAVEPOINT", "COMMIT"]);
  });

  it("also flushes events queued while the queue is being flushed", async () => {
    let n = 0;
    const f = sqlPayload(async () => {
      n += 1;
      if (n === 1) await writeAuditEvent(f.payload, "audit-events", event, req as never);
      return {};
    });
    deferAuditWritesToCommit(f.payload);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    await commitOf(f)("tx-1");
    expect(f.calls).toEqual([
      "SAVEPOINT",
      "CREATE",
      "RELEASE SAVEPOINT",
      "SAVEPOINT",
      "CREATE",
      "RELEASE SAVEPOINT",
      "COMMIT",
    ]);
  });

  it("writes at once instead of queueing once the transaction is committing", async () => {
    const f = sqlPayload(async () => ({}));
    const commit = f.db.commitTransaction;
    f.db.commitTransaction = vi.fn(async function commitWithLateEvent(this: unknown, id: unknown) {
      await writeAuditEvent(f.payload, "audit-events", event, req as never);
      return commit.call(this, id);
    });
    deferAuditWritesToCommit(f.payload);
    await commitOf(f)("tx-1");
    expect(f.calls).toEqual(["SAVEPOINT", "CREATE", "RELEASE SAVEPOINT", "COMMIT"]);
  });

  it("does not retry event by event when the transaction cannot open a savepoint", async () => {
    const f = sqlPayload(async () => ({}));
    deferAuditWritesToCommit(f.payload);
    for (let i = 0; i < 3; i += 1) {
      await writeAuditEvent(f.payload, "audit-events", event, req as never);
    }
    f.execute.mockRejectedValue(new Error("current transaction is aborted"));
    await commitOf(f)("tx-1");
    expect(f.execute).toHaveBeenCalledTimes(1);
    expect(f.create).not.toHaveBeenCalled();
    expect(f.error).toHaveBeenCalledTimes(1);
    expect(f.calls).toEqual(["COMMIT"]);
  });
});

describe("deferAuditWritesToCommit across module copies", () => {
  it("flushes events queued by another copy of the module on the same adapter", async () => {
    const f = sqlPayload(async () => ({}));
    vi.resetModules();
    const copyA = await import("../../src/core/failOpenInsert");
    vi.resetModules();
    const copyB = await import("../../src/core/failOpenInsert");
    expect(copyB).not.toBe(copyA);

    copyA.deferAuditWritesToCommit(f.payload);
    const req = { context: {}, transactionID: "tx-1" } as never;
    await copyA.failOpenInsert(f.payload, req, () => f.db.create());
    await copyB.failOpenInsert(f.payload, req, () => f.db.create());
    await (f.db.commitTransaction as (id: unknown) => Promise<void>)("tx-1");

    expect(f.create).toHaveBeenCalledTimes(2);
    expect(f.calls).toEqual(["SAVEPOINT", "CREATE", "CREATE", "RELEASE SAVEPOINT", "COMMIT"]);
  });
});

function mongoPayload(createImpl: () => Promise<unknown> = async () => ({})) {
  const calls: string[] = [];
  const create = vi.fn(async (args: { req?: unknown }) => {
    calls.push(args.req ? "CREATE in session" : "CREATE");
    return createImpl();
  });
  const error = vi.fn();
  const session = { inTransaction: vi.fn(() => true), commitTransaction: vi.fn(async () => {}) };
  const sessions: Record<string, typeof session | undefined> = { "tx-1": session };
  const takeSession = async (id: unknown) => {
    const key = String(await id);
    const found = sessions[key];
    sessions[key] = undefined;
    return found;
  };
  const commitTransaction = vi.fn(async (id: unknown) => {
    const found = await takeSession(id);
    if (!found?.inTransaction()) return;
    await found.commitTransaction();
    calls.push("COMMIT");
  });
  const rollbackTransaction = vi.fn(async (id: unknown) => {
    await takeSession(id);
    calls.push("ROLLBACK");
  });
  const db = { create, sessions, commitTransaction, rollbackTransaction };
  const payload = { db, logger: { error } };
  return { calls, create, db, error, payload: payload as never, session };
}

const commitMongo = (f: ReturnType<typeof mongoPayload>, id: unknown = "tx-1") =>
  f.db.commitTransaction(id);

describe("writeAuditEvent on a mongo-like adapter (transactions without savepoints)", () => {
  const req = { context: {}, transactionID: Promise.resolve("tx-1") };

  it("queues events of a transaction and writes them outside the session after a successful commit", async () => {
    const f = mongoPayload();
    deferAuditWritesToCommit(f.payload);
    await Promise.all([
      writeAuditEvent(f.payload, "audit-events", event, req as never),
      writeAuditEvent(f.payload, "audit-events", event, req as never),
    ]);
    expect(f.calls).toEqual([]);
    await commitMongo(f, Promise.resolve("tx-1"));
    expect(f.calls).toEqual(["COMMIT", "CREATE", "CREATE"]);
    for (const [args] of f.create.mock.calls) expect(args.req).toBeUndefined();
    expect(f.error).not.toHaveBeenCalled();
  });

  it("drops the queued events when the transaction is rolled back", async () => {
    const f = mongoPayload();
    deferAuditWritesToCommit(f.payload);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    await f.db.rollbackTransaction("tx-1");
    await commitMongo(f);
    expect(f.calls).toEqual(["ROLLBACK"]);
    expect(f.create).not.toHaveBeenCalled();
  });

  it("drops the queued events and rethrows when the commit fails", async () => {
    const f = mongoPayload();
    deferAuditWritesToCommit(f.payload);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    f.session.commitTransaction.mockRejectedValueOnce(new Error("write conflict"));
    await expect(commitMongo(f)).rejects.toThrow("write conflict");
    expect(f.create).not.toHaveBeenCalled();
  });

  it("drops the queued events when the session is no longer in a transaction at commit", async () => {
    const f = mongoPayload();
    deferAuditWritesToCommit(f.payload);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    f.session.inTransaction.mockReturnValue(false);
    await commitMongo(f);
    expect(f.create).not.toHaveBeenCalled();
  });

  it("logs a failed after-commit write, still writes the other events and never throws", async () => {
    let n = 0;
    const f = mongoPayload(async () => {
      n += 1;
      if (n === 1) throw new Error("audit write failed");
      return {};
    });
    deferAuditWritesToCommit(f.payload);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    await expect(commitMongo(f)).resolves.toBeUndefined();
    expect(f.create).toHaveBeenCalledTimes(2);
    expect(f.error).toHaveBeenCalledTimes(1);
  });

  it("writes at once outside the session when the commit deferral is not installed", async () => {
    const f = mongoPayload();
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    expect(f.calls).toEqual(["CREATE"]);
  });

  it("writes at once, logs and resolves when there is no transaction", async () => {
    const f = mongoPayload(async () => {
      throw new Error("db down");
    });
    deferAuditWritesToCommit(f.payload);
    await expect(
      writeAuditEvent(f.payload, "audit-events", event, { context: {} } as never)
    ).resolves.toBeUndefined();
    expect(f.create).toHaveBeenCalledTimes(1);
    expect(f.error).toHaveBeenCalledTimes(1);
  });

  it("writes events that arrive after the commit started at once", async () => {
    const f = mongoPayload();
    deferAuditWritesToCommit(f.payload);
    await commitMongo(f);
    await writeAuditEvent(f.payload, "audit-events", event, req as never);
    expect(f.calls).toEqual(["COMMIT", "CREATE in session"]);
  });
});

describe("writes buffered until a command ends", () => {
  const req = { context: {}, transactionID: Promise.resolve("tx-1") };
  const withWarn = <T extends { payload: never }>(f: T) => {
    const warn = vi.fn();
    Object.assign(f.payload as object, { logger: { ...(f.payload as any).logger, warn } });
    return { ...f, warn };
  };

  it("holds committed SQL writes and writes them once the command ends, outside the transaction", async () => {
    const f = withWarn(sqlPayload(async () => ({})));
    deferAuditWritesToCommit(f.payload);
    await bufferAuditWritesUntilCommandEnds(f.payload, async () => {
      await writeAuditEvent(f.payload, "audit-events", event, req as never);
      await (f.db.commitTransaction as (id: unknown) => Promise<void>)(req.transactionID);
      expect(f.calls).toEqual(["COMMIT"]);
    });
    expect(f.calls).toEqual(["COMMIT", "CREATE"]);
    expect(f.create.mock.calls[0]).toEqual([expect.objectContaining({ req: undefined })]);
    expect(f.warn).not.toHaveBeenCalled();
    expect(f.error).not.toHaveBeenCalled();
  });

  it("drops the writes of a rolled back transaction and keeps the committed ones", async () => {
    const f = withWarn(mongoPayload());
    deferAuditWritesToCommit(f.payload);
    const rolledBack = { context: {}, transactionID: Promise.resolve("tx-2") };
    f.db.sessions["tx-2"] = { ...f.session };
    await bufferAuditWritesUntilCommandEnds(f.payload, async () => {
      await writeAuditEvent(f.payload, "audit-events", event, req as never);
      await commitMongo(f);
      await writeAuditEvent(f.payload, "audit-events", event, rolledBack as never);
      await (f.db.rollbackTransaction as (id: unknown) => Promise<void>)("tx-2");
      expect(f.create).not.toHaveBeenCalled();
    });
    expect(f.create).toHaveBeenCalledTimes(1);
  });

  it("buffers writes made without a transaction too", async () => {
    const f = withWarn(sqlPayload(async () => ({})));
    deferAuditWritesToCommit(f.payload);
    await bufferAuditWritesUntilCommandEnds(f.payload, async () => {
      await writeAuditEvent(f.payload, "audit-events", event);
      expect(f.create).not.toHaveBeenCalled();
    });
    expect(f.create).toHaveBeenCalledTimes(1);
  });

  it("writes the buffer even when the command fails, and rethrows", async () => {
    const f = withWarn(sqlPayload(async () => ({})));
    const failure = new Error("migration failed");
    await expect(
      bufferAuditWritesUntilCommandEnds(f.payload, async () => {
        await writeAuditEvent(f.payload, "audit-events", event);
        throw failure;
      })
    ).rejects.toBe(failure);
    expect(f.create).toHaveBeenCalledTimes(1);
  });

  it("warns once, without an error stack, when the buffered writes still cannot be written", async () => {
    const f = withWarn(
      sqlPayload(async () => {
        throw new Error('relation "audit_events" does not exist');
      })
    );
    await bufferAuditWritesUntilCommandEnds(f.payload, async () => {
      await writeAuditEvent(f.payload, "audit-events", event);
      await writeAuditEvent(f.payload, "audit-events", event);
    });
    expect(f.create).toHaveBeenCalledTimes(2);
    expect(f.error).not.toHaveBeenCalled();
    expect(f.warn).toHaveBeenCalledTimes(1);
    const [message] = f.warn.mock.calls[0] as [string];
    expect(message).toBe(
      '[payload-plugin-audit-log] 2 audit event(s) recorded during the command could not be written: relation "audit_events" does not exist'
    );
  });

  it("writes the held events right after a recorded migration commits, outside the transaction", async () => {
    const f = withWarn(sqlPayload(async () => ({})));
    deferAuditWritesToCommit(f.payload);
    await bufferAuditWritesUntilCommandEnds(f.payload, async () => {
      await writeAuditEvent(f.payload, "audit-events", event);
      await writeAuditEvent(f.payload, "audit-events", event, req as never);
      await writeCommandEventsOnceCommitted(f.payload, req as never);
      expect(f.create).not.toHaveBeenCalled();
      await (f.db.commitTransaction as (id: unknown) => Promise<void>)(req.transactionID);
      expect(f.calls).toEqual(["COMMIT", "CREATE", "CREATE"]);
      for (const [args] of f.create.mock.calls as unknown as [{ req?: unknown }][]) {
        expect(args.req).toBeUndefined();
      }
    });
    expect(f.create).toHaveBeenCalledTimes(2);
  });

  it("writes the held events at once after a migration recorded without a transaction", async () => {
    const f = withWarn(sqlPayload(async () => ({})));
    deferAuditWritesToCommit(f.payload);
    await bufferAuditWritesUntilCommandEnds(f.payload, async () => {
      await writeAuditEvent(f.payload, "audit-events", event);
      await writeCommandEventsOnceCommitted(f.payload, { context: {} } as never);
      expect(f.create).toHaveBeenCalledTimes(1);
    });
    expect(f.create).toHaveBeenCalledTimes(1);
  });

  it("keeps the held events, quietly, while the audit table does not exist yet, and writes them later", async () => {
    let tableExists = false;
    const f = withWarn(
      sqlPayload(async () => {
        if (!tableExists) throw new Error('relation "audit_events" does not exist');
        return {};
      })
    );
    await bufferAuditWritesUntilCommandEnds(f.payload, async () => {
      await writeAuditEvent(f.payload, "audit-events", event);
      await writeAuditEvent(f.payload, "audit-events", event);
      await writeCommandEventsOnceCommitted(f.payload, undefined);
      expect(f.create).toHaveBeenCalledTimes(1);
      tableExists = true;
      await writeAuditEvent(f.payload, "audit-events", event);
      await writeCommandEventsOnceCommitted(f.payload, undefined);
      expect(f.create).toHaveBeenCalledTimes(4);
    });
    expect(f.create).toHaveBeenCalledTimes(4);
    expect(f.warn).not.toHaveBeenCalled();
    expect(f.error).not.toHaveBeenCalled();
  });

  it("does nothing outside a command", async () => {
    const f = withWarn(sqlPayload(async () => ({})));
    await writeCommandEventsOnceCommitted(f.payload, req as never);
    expect(f.create).not.toHaveBeenCalled();
    expect(f.calls).toEqual([]);
  });

  it("joins the outer buffer when commands nest", async () => {
    const f = withWarn(sqlPayload(async () => ({})));
    await bufferAuditWritesUntilCommandEnds(f.payload, async () => {
      await bufferAuditWritesUntilCommandEnds(f.payload, async () => {
        await writeAuditEvent(f.payload, "audit-events", event);
      });
      expect(f.create).not.toHaveBeenCalled();
    });
    expect(f.create).toHaveBeenCalledTimes(1);
  });
});

const failingRead = async () => {
  throw new Error("db down");
};

describe("readForAudit", () => {
  const txReq = { context: {}, transactionID: Promise.resolve("tx-1") };

  it("reads inside a savepoint of the SQL transaction and returns what it read", async () => {
    const f = sqlPayload(async () => ({}));
    const read = vi.fn(async () => {
      f.calls.push("READ");
      return { id: 1 };
    });
    await expect(readForAudit(f.payload, txReq as never, read, "reading failed")).resolves.toEqual({
      id: 1,
    });
    expect(f.calls).toEqual(["SAVEPOINT", "READ", "RELEASE SAVEPOINT"]);
    for (const [args] of f.execute.mock.calls) expect(args.db).toBe(f.tx);
    expect(f.error).not.toHaveBeenCalled();
  });

  it("rolls back to the savepoint, logs and returns undefined when the read fails", async () => {
    const f = sqlPayload(async () => ({}));
    const read = vi.fn(async () => {
      f.calls.push("READ");
      throw new Error("permission denied for table posts");
    });
    await expect(
      readForAudit(f.payload, txReq as never, read, "reading failed")
    ).resolves.toBeUndefined();
    expect(f.calls).toEqual(["SAVEPOINT", "READ", "ROLLBACK TO SAVEPOINT", "RELEASE SAVEPOINT"]);
    expect(f.error).toHaveBeenCalledTimes(1);
    const [logArg] = f.error.mock.calls[0] as [{ err: Error; msg: string }];
    expect(logArg.msg).toBe("[payload-plugin-audit-log] reading failed");
    expect(logArg.err.message).toBe("permission denied for table posts");
  });

  it("does not read when the savepoint cannot be opened", async () => {
    const f = sqlPayload(async () => ({}));
    f.execute.mockRejectedValueOnce(new Error("current transaction is aborted"));
    const read = vi.fn();
    await expect(
      readForAudit(f.payload, txReq as never, read, "reading failed")
    ).resolves.toBeUndefined();
    expect(read).not.toHaveBeenCalled();
    expect(f.error).toHaveBeenCalledTimes(1);
  });

  it("never interleaves with the savepoints of audit inserts on the same transaction", async () => {
    const f = sqlPayload(() => new Promise((resolve) => setTimeout(() => resolve({}), 5)));
    const read = async () => {
      f.calls.push("READ");
      return null;
    };
    await Promise.all([
      writeAuditEvent(f.payload, "audit-events", event, txReq as never),
      readForAudit(f.payload, txReq as never, read, "reading failed"),
    ]);
    expect(f.calls).toEqual([
      "SAVEPOINT",
      "CREATE",
      "RELEASE SAVEPOINT",
      "SAVEPOINT",
      "READ",
      "RELEASE SAVEPOINT",
    ]);
  });

  it("reads directly, logging a failure, outside a SQL transaction", async () => {
    const f = sqlPayload(async () => ({}));
    await expect(
      readForAudit(f.payload, { context: {} } as never, failingRead, "reading failed")
    ).resolves.toBeUndefined();
    await expect(readForAudit(f.payload, undefined, async () => 3, "reading failed")).resolves.toBe(
      3
    );
    const mongo = mongoPayload();
    await expect(readForAudit(mongo.payload, txReq as never, async () => 4, "x")).resolves.toBe(4);
    expect(f.execute).not.toHaveBeenCalled();
    expect(f.error).toHaveBeenCalledTimes(1);
  });
});

const coveredSessions = () =>
  (globalThis as Record<symbol, unknown>)[
    Symbol.for("payload-plugin-audit-log.coverageBySession")
  ] as WeakMap<object, unknown> | undefined;

const isCovered = (session: unknown): boolean =>
  Boolean(session) && (coveredSessions()?.has(session as object) ?? false);

const adapters = [
  ["SQL", () => sqlPayload(async () => ({}))],
  ["document store", () => mongoPayload()],
] as const;

type TransactionMethod = (id: unknown) => Promise<void>;

describe("ending a transaction", () => {
  it.each(adapters)(
    "rolling back on a %s adapter ends the coverage of its requests and forgets the transaction",
    async (_adapter, adapterPayload) => {
      const f = adapterPayload();
      deferAuditWritesToCommit(f.payload);
      const req = { context: {}, transactionID: "tx-1", payload: f.payload };
      const session = f.db.sessions["tx-1"];
      markActive(req, "posts", "1");
      expect(isCovered(session)).toBe(true);
      await (f.db.rollbackTransaction as TransactionMethod)(Promise.resolve(req.transactionID));
      expect(isActive(req, "posts", "1")).toBe(false);
      expect(isCovered(session)).toBe(false);
    }
  );

  it.each(adapters)(
    "committing on a %s adapter forgets the transaction",
    async (_adapter, adapterPayload) => {
      const f = adapterPayload();
      deferAuditWritesToCommit(f.payload);
      const req = { context: {}, transactionID: "tx-1", payload: f.payload };
      const session = f.db.sessions["tx-1"];
      markActive(req, "posts", "1");
      expect(isCovered(session)).toBe(true);
      await (f.db.commitTransaction as TransactionMethod)(Promise.resolve("tx-1"));
      expect(isCovered(session)).toBe(false);
      expect(isActive(req, "posts", "1")).toBe(true);
    }
  );

  it("a commit that fails keeps the transaction, so the rollback that follows ends its coverage", async () => {
    const f = sqlPayload(async () => ({}));
    f.db.commitTransaction.mockRejectedValueOnce(new Error("connection lost"));
    deferAuditWritesToCommit(f.payload);
    const req = { context: {}, transactionID: "tx-1", payload: f.payload };
    const session = f.db.sessions["tx-1"];
    markActive(req, "posts", "1");
    await expect((f.db.commitTransaction as TransactionMethod)("tx-1")).rejects.toThrow(
      "connection lost"
    );
    expect(isCovered(session)).toBe(true);
    await (f.db.rollbackTransaction as TransactionMethod)("tx-1");
    expect(isActive(req, "posts", "1")).toBe(false);
    expect(isCovered(session)).toBe(false);
  });

  it("committing inside a command forgets the transaction too", async () => {
    const f = sqlPayload(async () => ({}));
    deferAuditWritesToCommit(f.payload);
    const session = f.db.sessions["tx-1"];
    await bufferAuditWritesUntilCommandEnds(f.payload, async () => {
      markActive({ context: {}, transactionID: "tx-1", payload: f.payload }, "posts", "1");
      expect(isCovered(session)).toBe(true);
      await (f.db.commitTransaction as TransactionMethod)("tx-1");
    });
    expect(isCovered(session)).toBe(false);
  });
});
