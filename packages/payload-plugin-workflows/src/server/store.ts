// The runs collection: one row per run, the only place run state is stored. Two writes change it,
// `createRun` and `mutateRun`, each queueing the run's effect jobs in the same transaction.

import { randomUUID } from "node:crypto";

import type { CollectionConfig, CollectionSlug, PayloadRequest, SelectType, Where } from "payload";
import { ValidationError, commitTransaction, initTransaction, killTransaction } from "payload";

import { EFFECT_TASK, JOBS_QUEUE, QUEUED_JOBS, RUNS_SLUG } from "../constants.js";
import { WorkflowError } from "../engine/errors.js";
import { waitingOnOf } from "../engine/view.js";
import type { InstanceState, Result, WorkflowDefinition } from "../types.js";
import { transactionLost, transactionOf, writing } from "./transaction.js";

/**
 * Runs are read by users of the admin user collection and written by nobody over the API: state
 * changes only through the plugin's operations, so the history cannot be edited.
 */
export const runsCollection: CollectionConfig = {
  slug: RUNS_SLUG,
  labels: { singular: "Workflow run", plural: "Workflow runs" },
  timestamps: true,
  admin: {
    hidden: true,
    useAsTitle: "workflow",
    defaultColumns: ["workflow", "subjectCollection", "subjectId", "stage", "status", "updatedAt"],
  },
  access: {
    // The plugin's functions further drop runs whose document the caller cannot read.
    read: ({ req }) => Boolean(req.user && req.user.collection === req.payload.config.admin?.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: "workflow", type: "text", required: true, index: true },
    { name: "subjectCollection", type: "text", required: true, index: true },
    // Always a string, whatever the subject collection's id type.
    { name: "subjectId", type: "text", required: true, index: true },
    { name: "stage", type: "text", required: true, index: true },
    {
      name: "status",
      type: "select",
      required: true,
      index: true,
      options: ["active", "completed", "aborted"],
    },
    { name: "fields", type: "json" },
    { name: "activities", type: "json" },
    { name: "fired", type: "json" },
    { name: "history", type: "json" },
    // Denormalised from the run's `waitingOn` on every write, so the inbox is one query.
    { name: "assignedUsers", type: "text", hasMany: true, index: true },
    { name: "assignedRoles", type: "text", hasMany: true, index: true },
    // Optimistic concurrency: every write requires the revision it read.
    { name: "revision", type: "number", required: true, defaultValue: 1 },
    // `<workflow>:<collection>:<id>` while active, `done:<random>` after: one active run per document.
    { name: "activeKey", type: "text", required: true, unique: true },
    { name: "completedAt", type: "date" },
  ],
};

/** A row of the runs collection. */
export interface InstanceDoc {
  id: string | number;
  workflow: string;
  subjectCollection: string;
  subjectId: string;
  stage: string;
  status: InstanceState["status"];
  fields?: Record<string, unknown> | null;
  activities?: InstanceState["activities"] | null;
  fired?: string[] | null;
  history?: InstanceState["history"] | null;
  assignedUsers?: string[] | null;
  assignedRoles?: string[] | null;
  revision: number;
  activeKey: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  collection: string;
  id: string;
}

export type JobId = string | number;

export const subjectOf = (doc: InstanceDoc): Subject => ({
  collection: doc.subjectCollection,
  id: doc.subjectId,
});

const activeKeyOf = (workflow: string, subject: Subject): string =>
  `${workflow}:${subject.collection}:${subject.id}`;

export const toState = (doc: InstanceDoc): InstanceState => ({
  workflow: doc.workflow,
  stage: doc.stage,
  status: doc.status,
  fields: doc.fields ?? {},
  activities: doc.activities ?? {},
  fired: doc.fired ?? [],
  history: doc.history ?? [],
  startedAt: doc.createdAt,
  ...(doc.completedAt ? { completedAt: doc.completedAt } : {}),
});

const toData = (state: InstanceState, def: WorkflowDefinition | undefined, subject: Subject) => {
  const waiting = def ? waitingOnOf(def, state) : { users: [], roles: [] };
  return {
    workflow: state.workflow,
    subjectCollection: subject.collection,
    subjectId: subject.id,
    stage: state.stage,
    status: state.status,
    fields: state.fields,
    activities: state.activities,
    fired: state.fired,
    history: state.history,
    assignedUsers: waiting.users,
    assignedRoles: waiting.roles,
    activeKey:
      state.status === "active" ? activeKeyOf(state.workflow, subject) : `done:${randomUUID()}`,
    completedAt: state.completedAt ?? null,
  };
};

// ---- Reads (full access: callers check access themselves) ----------------------------------

export const loadRun = async (req: PayloadRequest, id: JobId): Promise<InstanceDoc> => {
  const doc = await req.payload.findByID({
    collection: RUNS_SLUG as CollectionSlug,
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  });
  if (!doc) {
    throw new WorkflowError("unknown-instance", `There is no workflow run "${id}".`);
  }
  return doc as unknown as InstanceDoc;
};

/** Everything but the audit trail: enough to evaluate guards and to decide whether a run moves. */
export const WITHOUT_HISTORY: SelectType = { history: false };

export const findRuns = async (
  req: PayloadRequest,
  where: Where,
  select?: SelectType
): Promise<InstanceDoc[]> => {
  const result = await req.payload.find({
    collection: RUNS_SLUG as CollectionSlug,
    where,
    depth: 0,
    limit: 0,
    pagination: false,
    sort: "-createdAt",
    overrideAccess: true,
    req,
    ...(select ? { select } : {}),
  });
  return result.docs as unknown as InstanceDoc[];
};

export const subjectWhere = (subject: Subject, activeOnly: boolean): Where => ({
  and: [
    { subjectCollection: { equals: subject.collection } },
    { subjectId: { equals: subject.id } },
    ...(activeOnly ? [{ status: { equals: "active" } }] : []),
  ],
});

export const isRunning = async (req: PayloadRequest, workflow: string, subject: Subject) =>
  (await findRuns(req, { activeKey: { equals: activeKeyOf(workflow, subject) } })).length > 0;

// ---- Writes ---------------------------------------------------------------------------------

export interface Committed {
  doc: InstanceDoc;
  /** Effect jobs queued by this write. */
  jobs: JobId[];
}

/** Runs `fn` in a transaction: its own when `req` has none, the caller's otherwise. */
const inTransaction = async <T>(req: PayloadRequest, fn: () => Promise<T>): Promise<T> => {
  const owns = await initTransaction(req);
  try {
    const result = await fn();
    if (owns) {
      await commitTransaction(req);
    }
    return result;
  } catch (error) {
    if (owns) {
      await killTransaction(req);
    }
    throw error;
  }
};

/**
 * Queues one job per effect with the same `req`, so the state change and its effects commit
 * together (an outbox). The ids are also reported to an inline effect run in progress, if any.
 */
const queueEffects = async (
  req: PayloadRequest,
  instanceId: JobId,
  effects: Result["effects"]
): Promise<JobId[]> => {
  const queue = req.payload.jobs.queue as unknown as (args: {
    task: string;
    queue: string;
    input: Record<string, string>;
    req: PayloadRequest;
  }) => Promise<{ id: JobId }>;
  const ids: JobId[] = [];
  for (const effect of effects) {
    const job = await writing(req, () =>
      queue({
        task: EFFECT_TASK,
        queue: JOBS_QUEUE,
        input: {
          instanceId: String(instanceId),
          effect: effect.name,
          activity: effect.activity,
          action: effect.action,
        },
        req,
      })
    );
    ids.push(job.id);
  }
  const collector = req.context?.[QUEUED_JOBS];
  if (Array.isArray(collector)) {
    collector.push(...ids);
  }
  return ids;
};

/**
 * Inserts a new run. A second active run of the same workflow on a document is `already-running`.
 * Losing that race inside a caller's transaction ends the transaction (Payload rolls it back when
 * `create` fails): the error says so, so the caller does not commit believing its writes survived.
 */
export const createRun = async (
  req: PayloadRequest,
  def: WorkflowDefinition,
  result: Result,
  subject: Subject
): Promise<Committed> => {
  const began = await transactionOf(req);
  try {
    return await inTransaction(req, async () => {
      const doc = (await req.payload.create({
        collection: RUNS_SLUG as CollectionSlug,
        data: { ...toData(result.state, def, subject), revision: 1 } as never,
        depth: 0,
        overrideAccess: true,
        req,
      })) as unknown as InstanceDoc;
      return { doc, jobs: await queueEffects(req, doc.id, result.effects) };
    });
  } catch (error) {
    const clash =
      error instanceof ValidationError &&
      (error.data?.errors ?? []).some((entry) => entry.path === "activeKey");
    if (clash) {
      const lost = (await transactionLost(req, began))
        ? " The failed insert rolled back the request's transaction: nothing written with it so far was saved."
        : "";
      throw new WorkflowError(
        "already-running",
        `Workflow "${def.name}" is already running on this document.${lost}`
      );
    }
    throw error;
  }
};

/** Optimistic-lock attempts before a write gives up with `conflict`. */
const ATTEMPTS = 3;

/**
 * Load, compute, then write only if `revision` is still what was read: a compare-and-swap in the
 * database adapter (`db.updateOne` with a `where`). A lost race reloads and re-runs `compute` on
 * fresh state; after the last attempt it is `conflict`. `compute` returning `null` or the state it
 * was given means "nothing to write".
 */
export const mutateRun = async (
  req: PayloadRequest,
  def: WorkflowDefinition | undefined,
  id: JobId,
  compute: (state: InstanceState) => Result | null
): Promise<Committed> => {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const outcome = await inTransaction(req, async (): Promise<Committed | null> => {
      const doc = await loadRun(req, id);
      const state = toState(doc);
      const result = compute(state);
      if (!result || result.state === state) {
        return { doc, jobs: [] };
      }
      const updated = await writing(req, () =>
        req.payload.db.updateOne({
          collection: RUNS_SLUG,
          where: { and: [{ id: { equals: doc.id } }, { revision: { equals: doc.revision } }] },
          data: {
            ...toData(result.state, def, subjectOf(doc)),
            revision: doc.revision + 1,
            updatedAt: new Date().toISOString(),
          },
          req,
        })
      );
      if (!updated) {
        return null;
      }
      return {
        doc: updated as unknown as InstanceDoc,
        jobs: await queueEffects(req, doc.id, result.effects),
      };
    });
    if (outcome) {
      return outcome;
    }
  }
  throw new WorkflowError(
    "conflict",
    "The workflow run was changed by someone else at the same time. Reload and try again."
  );
};
