import { randomUUID } from "node:crypto";
import type { Payload, PayloadRequest } from "payload";
import { failOpen } from "../utils/failOpen";
import { logError } from "../utils/logError";
import type { CommandWrites } from "./commandWriteBuffer";
import {
  activeCommandWrites,
  holdCommittedWrites,
  writeHeldUntilFirstFailure,
} from "./commandWriteBuffer";
import { forgetCoverageOfSession, releaseCoverageOfSession } from "./requestState";

type AuditWrite = (req?: PayloadRequest) => Promise<unknown>;

type Insert = () => Promise<unknown>;
type TransactionMethod = (this: unknown, id?: unknown) => Promise<unknown>;
type SqlSession = { db?: unknown };
type DocumentStoreSession = { inTransaction?: () => boolean };

type TransactionalAdapter = {
  execute?: (args: { db: unknown; raw: string }) => unknown;
  sessions?: Record<string, unknown>;
  commitTransaction?: TransactionMethod;
  rollbackTransaction?: TransactionMethod;
};

type SqlAdapter = TransactionalAdapter & {
  execute: (args: { db: unknown; raw: string }) => unknown;
};

type OpenTransaction =
  | { savepoints: true; session: SqlSession; tx: object }
  | { savepoints: false; session: object };

const WRITE_FAILURE = "failed to write the audit event";

const COMMIT_QUEUES = Symbol.for("payload-plugin-audit-log.deferToCommit");
const STATEMENT_CHAINS = Symbol.for("payload-plugin-audit-log.statementChains");

type CommitQueues = {
  pendingBySession: WeakMap<object, Insert[]>;
  flushedSessions: WeakSet<object>;
};

type StatementChains = WeakMap<object, Promise<void>>;

type StateSharedAcrossModuleCopies = {
  [COMMIT_QUEUES]?: CommitQueues;
  [STATEMENT_CHAINS]?: StatementChains;
};

type AdapterWithSharedState = TransactionalAdapter & StateSharedAcrossModuleCopies;

const adapterOf = (payload: Payload): AdapterWithSharedState =>
  payload.db as unknown as AdapterWithSharedState;

const runsRawSql = (db: TransactionalAdapter): db is SqlAdapter => typeof db.execute === "function";

function isInTransaction(session: unknown): boolean {
  const inTransaction = (session as DocumentStoreSession | undefined)?.inTransaction;
  return typeof inTransaction === "function" && inTransaction.call(session);
}

function statementChainsOf(payload: Payload): StatementChains {
  const db = adapterOf(payload);
  db[STATEMENT_CHAINS] ??= new WeakMap();
  return db[STATEMENT_CHAINS];
}

const sessionWithID = (db: TransactionalAdapter, id: unknown): unknown => db.sessions?.[String(id)];

async function sessionOf(db: TransactionalAdapter, incomingID: unknown): Promise<unknown> {
  return sessionWithID(db, await incomingID);
}

type RequestInTransaction = { transactionID?: unknown };

async function findOpenTransaction(
  payload: Payload,
  req?: RequestInTransaction
): Promise<OpenTransaction | undefined> {
  if (!req?.transactionID) return undefined;
  const db = adapterOf(payload);
  const session = await sessionOf(db, req.transactionID);
  if (runsRawSql(db)) {
    const tx = (session as SqlSession | undefined)?.db;
    return tx ? { savepoints: true, session: session as SqlSession, tx } : undefined;
  }
  return isInTransaction(session) ? { savepoints: false, session: session as object } : undefined;
}

async function ignoreFailure(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
  } catch {
    return;
  }
}

function runAfterEarlierAuditStatements<T>(
  payload: Payload,
  tx: object,
  task: () => Promise<T>
): Promise<T> {
  const chains = statementChainsOf(payload);
  const previous = chains.get(tx);
  const next = (async () => {
    if (previous) await previous;
    return task();
  })();
  chains.set(tx, ignoreFailure(next));
  return next;
}

function uniqueSavepointName(): string {
  return `audit_${randomUUID().replaceAll("-", "_")}`;
}

type SavepointOutcome<T> =
  | { outcome: "done"; value: T }
  | { outcome: "taskFailed" }
  | { outcome: "transactionUnavailable" };

type SavepointMessages = { unavailable: string; taskFailure?: string };

async function inSavepoint<T>(
  payload: Payload,
  tx: unknown,
  task: () => Promise<T>,
  messages: SavepointMessages
): Promise<SavepointOutcome<T>> {
  const db = payload.db as unknown as SqlAdapter;
  const run = async (raw: string) => {
    await db.execute({ db: tx, raw });
  };
  const savepoint = uniqueSavepointName();

  try {
    await run(`SAVEPOINT ${savepoint}`);
  } catch (err) {
    logError(payload, messages.unavailable, err);
    return { outcome: "transactionUnavailable" };
  }

  let value: T;
  try {
    value = await task();
  } catch (err) {
    if (messages.taskFailure) logError(payload, messages.taskFailure, err);
    try {
      await run(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      await run(`RELEASE SAVEPOINT ${savepoint}`);
    } catch (cleanupErr) {
      logError(payload, "could not roll back the audit savepoint", cleanupErr);
      return { outcome: "transactionUnavailable" };
    }
    return { outcome: "taskFailed" };
  }

  try {
    await run(`RELEASE SAVEPOINT ${savepoint}`);
  } catch (err) {
    logError(payload, "could not release the audit savepoint", err);
  }
  return { outcome: "done", value };
}

async function insertWithSavepoint(
  payload: Payload,
  tx: unknown,
  inserts: readonly Insert[]
): Promise<SavepointOutcome<void>["outcome"]> {
  const { outcome } = await inSavepoint(
    payload,
    tx,
    async () => {
      for (const insert of inserts) await insert();
    },
    {
      unavailable: `could not open a savepoint, ${inserts.length} audit event(s) skipped`,
      ...(inserts.length === 1 ? { taskFailure: WRITE_FAILURE } : {}),
    }
  );
  return outcome;
}

async function insertOneByOne(payload: Payload, tx: object, inserts: readonly Insert[]) {
  for (const insert of inserts) {
    const outcome = await insertWithSavepoint(payload, tx, [insert]);
    if (outcome === "transactionUnavailable") return;
  }
}

async function flush(payload: Payload, tx: object, inserts: readonly Insert[]): Promise<void> {
  await runAfterEarlierAuditStatements(payload, tx, async () => {
    const outcome = await insertWithSavepoint(payload, tx, inserts);
    if (outcome === "taskFailed" && inserts.length > 1) {
      await insertOneByOne(payload, tx, inserts);
    }
  });
}

function takeQueue(queues: CommitQueues, session: unknown): Insert[] | undefined {
  if (!session || typeof session !== "object") return undefined;
  const queue = queues.pendingBySession.get(session);
  queues.pendingBySession.delete(session);
  return queue;
}

function enqueue(queues: CommitQueues, session: object, insert: Insert): void {
  const queue = queues.pendingBySession.get(session);
  if (queue) queue.push(insert);
  else queues.pendingBySession.set(session, [insert]);
}

async function drainBeforeCommit(payload: Payload, queues: CommitQueues, session: SqlSession) {
  const tx = session.db as object;
  for (let queue = takeQueue(queues, session); queue; queue = takeQueue(queues, session)) {
    await flush(payload, tx, queue);
  }
  queues.flushedSessions.add(session);
}

type AdapterCall = () => Promise<unknown>;

async function commitIntoCommand(
  queues: CommitQueues,
  command: CommandWrites,
  session: unknown,
  commitByAdapter: AdapterCall
): Promise<unknown> {
  const committed = takeQueue(queues, session) ?? [];
  const result = await commitByAdapter();
  await holdCommittedWrites(command, committed);
  return result;
}

async function settledTransactionID(incomingID: unknown): Promise<unknown> {
  try {
    return await incomingID;
  } catch {
    return undefined;
  }
}

type QueueHandling = {
  commit: (session: unknown, commitByAdapter: AdapterCall) => Promise<unknown>;
  rollback: (session: unknown, rollbackByAdapter: AdapterCall) => Promise<unknown>;
};

const flushQueuesBeforeSqlCommit = (payload: Payload, queues: CommitQueues): QueueHandling => ({
  commit: async (session, commitByAdapter) => {
    try {
      const sqlSession = session as SqlSession | undefined;
      if (sqlSession?.db) await drainBeforeCommit(payload, queues, sqlSession);
    } catch (err) {
      logError(payload, "could not write the queued audit events", err);
    }
    return commitByAdapter();
  },
  rollback: (session, rollbackByAdapter) => {
    takeQueue(queues, session);
    return rollbackByAdapter();
  },
});

const writeQueuesAfterCommit = (payload: Payload, queues: CommitQueues): QueueHandling => ({
  commit: async (session, commitByAdapter) => {
    const commitsTransaction = isInTransaction(session);
    let result: unknown;
    try {
      result = await commitByAdapter();
    } catch (err) {
      takeQueue(queues, session);
      throw err;
    }
    const committed = takeQueue(queues, session);
    if (commitsTransaction && committed) {
      for (const insert of committed) await failOpen(payload, WRITE_FAILURE, insert);
    }
    return result;
  },
  rollback: async (session, rollbackByAdapter) => {
    try {
      return await rollbackByAdapter();
    } finally {
      takeQueue(queues, session);
    }
  },
});

export function deferAuditWritesToCommit(payload: Payload, adapter: unknown = payload.db): void {
  const db = adapter as AdapterWithSharedState;
  if (!db || db[COMMIT_QUEUES]) return;
  const commit = db.commitTransaction;
  const rollback = db.rollbackTransaction;
  if (typeof commit !== "function" || typeof rollback !== "function") return;
  const queues: CommitQueues = { pendingBySession: new WeakMap(), flushedSessions: new WeakSet() };
  db[COMMIT_QUEUES] = queues;
  const handling = runsRawSql(db)
    ? flushQueuesBeforeSqlCommit(payload, queues)
    : writeQueuesAfterCommit(payload, queues);

  db.commitTransaction = async function commitTransaction(this: unknown, incomingID?: unknown) {
    const session = sessionWithID(db, await settledTransactionID(incomingID));
    const commitByAdapter = () => commit.call(this ?? db, incomingID);
    const command = activeCommandWrites();
    const result = command
      ? await commitIntoCommand(queues, command, session, commitByAdapter)
      : await handling.commit(session, commitByAdapter);
    forgetCoverageOfSession(session);
    return result;
  };

  db.rollbackTransaction = async function rollbackTransaction(this: unknown, incomingID?: unknown) {
    const session = sessionWithID(db, await settledTransactionID(incomingID));
    releaseCoverageOfSession(session);
    return handling.rollback(session, () => rollback.call(this ?? db, incomingID));
  };
}

async function insertInSqlTransaction(
  payload: Payload,
  transaction: Extract<OpenTransaction, { savepoints: true }>,
  insert: Insert
): Promise<void> {
  const queues = adapterOf(payload)[COMMIT_QUEUES];
  const canWaitForCommit = queues && !queues.flushedSessions.has(transaction.session);
  if (canWaitForCommit) {
    enqueue(queues, transaction.session, insert);
    return;
  }
  const { tx } = transaction;
  await runAfterEarlierAuditStatements(payload, tx, () =>
    insertWithSavepoint(payload, tx, [insert])
  );
}

async function insertAfterCommit(payload: Payload, session: object, insert: Insert): Promise<void> {
  const queues = adapterOf(payload)[COMMIT_QUEUES];
  if (queues) {
    enqueue(queues, session, insert);
    return;
  }
  await failOpen(payload, WRITE_FAILURE, insert);
}

function holdUntilCommitted(
  payload: Payload,
  command: CommandWrites,
  transaction: OpenTransaction | undefined,
  insert: Insert
): void {
  const queues = adapterOf(payload)[COMMIT_QUEUES];
  if (transaction && queues) enqueue(queues, transaction.session, insert);
  else command.held.push(insert);
}

export async function writeCommandEventsOnceCommitted(
  payload: Payload,
  req: RequestInTransaction | undefined
): Promise<void> {
  const command = activeCommandWrites();
  if (!command) return;
  const transaction = await findOpenTransaction(payload, req).catch(() => undefined);
  if (transaction) command.writeAfterNextCommit = true;
  else await writeHeldUntilFirstFailure(command);
}

export async function failOpenInsert(
  payload: Payload,
  req: PayloadRequest | undefined,
  write: AuditWrite
): Promise<void> {
  let transaction: OpenTransaction | undefined;
  try {
    transaction = await findOpenTransaction(payload, req);
  } catch (err) {
    logError(payload, "could not resolve the transaction for the audit event", err);
    return;
  }

  const command = activeCommandWrites();
  if (command) {
    holdUntilCommitted(payload, command, transaction, () => write());
    return;
  }

  if (!transaction) {
    await failOpen(payload, WRITE_FAILURE, () => write(req));
    return;
  }

  if (transaction.savepoints) {
    await insertInSqlTransaction(payload, transaction, () => write(req));
    return;
  }

  await insertAfterCommit(payload, transaction.session, () => write());
}

export async function readForAudit<T>(
  payload: Payload,
  req: RequestInTransaction | undefined,
  read: () => Promise<T>,
  failure: string
): Promise<T | undefined> {
  let transaction: OpenTransaction | undefined;
  try {
    transaction = await findOpenTransaction(payload, req);
  } catch (err) {
    logError(payload, failure, err);
    return undefined;
  }
  if (!transaction?.savepoints) return failOpen(payload, failure, read);

  const { tx } = transaction;
  const result = await runAfterEarlierAuditStatements(payload, tx, () =>
    inSavepoint(payload, tx, read, { unavailable: failure, taskFailure: failure })
  );
  return result.outcome === "done" ? result.value : undefined;
}
