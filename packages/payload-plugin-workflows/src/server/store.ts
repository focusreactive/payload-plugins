// The runs collection: one row per run, holding what the engine needs to decide (stage, fields,
// activities, visit, next event number). Two writes change it, `createRun` and `mutateRun`, each
// inserting the step's events and queueing its effect jobs in the same transaction.

import { randomUUID } from "node:crypto";

import type {
  CollectionConfig,
  CollectionSlug,
  Endpoint,
  Field,
  Payload,
  PayloadRequest,
  Where,
} from "payload";
import {
  ValidationError,
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
} from "payload";

import { formatAdminURL } from "payload/shared";

import { encodeAssignees } from "../assignees.js";
import type { TKey } from "../components/shared/format.js";
import {
  EFFECT_TASK,
  EVENTS_SLUG,
  JOBS_QUEUE,
  QUEUED_JOBS,
  RUNS_SLUG,
  SCHEMA_VERSION,
  componentPath,
} from "../constants.js";
import { WorkflowError } from "../engine/errors.js";
import { NAMESPACE } from "../translations.js";
import { waitingOnOf } from "../engine/view.js";
import type { Actor, InstanceState, Result, WorkflowDefinition } from "../types.js";
import { readWorkflows } from "./access.js";
import { insertEvents } from "./events.js";
import { transactionLost, transactionOf, writing } from "./transaction.js";

/** A label in the admin's language, from the plugin's strings. */
const label =
  (key: TKey) =>
  ({ t }: { t: unknown }): string =>
    (t as (key: string) => string)(`${NAMESPACE}:${key}`);

/** In the database and the API; not in the admin, which shows the run in the document's drawer. */
const internal = { hidden: true } as const;

/** The columns the admin list's cells and row links read, whatever columns are shown. */
const LIST_COLUMNS = {
  workflow: true,
  subjectCollection: true,
  subjectId: true,
  stage: true,
  status: true,
} as const;

/**
 * Runs are read by users of the admin user collection, each only on documents they may read
 * (`readWorkflows`), and written by nobody over the API: state changes only through the plugin's
 * operations. In the admin it is the read-only list of
 * workflows ("Workflows"): a row links to its document, where the drawer shows and moves the run.
 * The plugin's REST endpoints are this collection's (`/api/workflow-instances/state`, …). With
 * `components: false` (the plugin disabled) it keeps its data and API but has no admin cells.
 */
export const runsCollection = (options: {
  endpoints?: Endpoint[];
  components: boolean;
  /** The host's `visibility.fields`: read-only columns the read rule may query. */
  visibilityFields?: Field[];
}): CollectionConfig => {
  const cell = (entry: "client" | "rsc", name: string) =>
    options.components ? { components: { Cell: componentPath(entry, name) } } : {};
  return {
    slug: RUNS_SLUG,
    labels: { singular: label("listSingular"), plural: label("listPlural") },
    timestamps: true,
    defaultSort: "-updatedAt",
    admin: {
      description: label("listDescription"),
      useAsTitle: "workflow",
      defaultColumns: ["subjectId", "workflow", "stage", "status", "assignees", "updatedAt"],
      // The row opens its document, not the run.
      formatDocURL: ({ doc, req }) =>
        formatAdminURL({
          adminRoute: req.payload.config.routes.admin,
          path: `/collections/${String(doc.subjectCollection)}/${encodeURIComponent(String(doc.subjectId))}`,
        }),
      disableCopyToLocale: true,
      // The list reads the shown columns (and `LIST_COLUMNS`), never the run's state.
      enableListViewSelectAPI: true,
      ...(options.components ? {} : { hidden: true }),
    },
    forceSelect: LIST_COLUMNS,
    access: {
      read: readWorkflows,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    ...(options.endpoints ? { endpoints: options.endpoints } : {}),
    // The hooks' per-save lookup: a document's active runs.
    indexes: [{ fields: ["subjectCollection", "subjectId", "status"] }],
    fields: [
      {
        name: "workflow",
        type: "text",
        required: true,
        index: true,
        label: label("columnWorkflow"),
        admin: cell("rsc", "RunCell"),
      },
      {
        name: "subjectCollection",
        type: "text",
        required: true,
        index: true,
        label: label("columnCollection"),
      },
      // Always a string, whatever the subject collection's id type.
      {
        name: "subjectId",
        type: "text",
        required: true,
        index: true,
        label: label("columnDocument"),
        admin: cell("client", "SubjectCell"),
      },
      {
        name: "stage",
        type: "text",
        required: true,
        index: true,
        label: label("columnStage"),
        admin: cell("rsc", "RunCell"),
      },
      {
        name: "status",
        type: "select",
        required: true,
        index: true,
        label: label("columnStatus"),
        options: [
          { value: "active", label: label("statusRunning") },
          { value: "completed", label: label("statusCompleted") },
          { value: "aborted", label: label("statusAborted") },
        ],
        admin: cell("rsc", "RunCell"),
      },
      { name: "fields", type: "json", admin: internal },
      { name: "activities", type: "json", admin: internal },
      { name: "fired", type: "json", admin: internal },
      // Transitions taken: which visit of its stage the run is in (an effect's result lands only
      // in the visit that queued it).
      { name: "visit", type: "number", required: true, defaultValue: 0, admin: internal },
      // The stages entered so far (the stepper marks them done).
      { name: "visited", type: "json", admin: internal },
      // The `seq` of the run's next event (`workflow-events`): exact, because every write that
      // adds events is a compare-and-swap on `revision`.
      { name: "nextSeq", type: "number", required: true, defaultValue: 1, admin: internal },
      { name: "startedBy", type: "json", admin: internal },
      // Provenance: the plugin's stored format, and the definition version the run started from.
      { name: "schemaVersion", type: "number", required: true, admin: internal },
      { name: "definitionVersion", type: "text", admin: internal },
      // Denormalised from the run's `waitingOn` on every write (`|u:<id>|r:<role>|`, see
      // `assignees.ts`), so "for me" is one query. A plain column: no side table to join.
      {
        name: "assignees",
        type: "text",
        index: true,
        label: label("columnWaitingOn"),
        admin: cell("client", "WaitingOnCell"),
      },
      // Optimistic concurrency: every write requires the revision it read.
      { name: "revision", type: "number", required: true, defaultValue: 1, admin: internal },
      // `<workflow>:<collection>:<id>` while active, `done:<random>` after: one active run per document.
      { name: "activeKey", type: "text", required: true, unique: true, admin: internal },
      { name: "completedAt", type: "date", label: label("columnFinished") },
      // A completed run of a workflow `requiredToPublish`: when a publish went through on it. A
      // run lets one publish through; the next needs a new run.
      { name: "publishedAt", type: "date", admin: internal },
      // Who may see the run (`visibility`): the host's fields, written by the plugin only.
      ...(options.visibilityFields ?? []).map(
        (field) => ({ ...field, admin: { ...field.admin, readOnly: true } }) as Field
      ),
    ],
  };
};

/** The runs collection's own columns: `visibility.fields` may not use these names. */
export const RUN_COLUMNS: readonly string[] = [
  "id",
  "createdAt",
  "updatedAt",
  ...runsCollection({ components: false }).fields.flatMap((field) =>
    "name" in field ? [field.name] : []
  ),
];

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
  visit?: number | null;
  visited?: string[] | null;
  nextSeq?: number | null;
  startedBy?: Actor | null;
  schemaVersion: number;
  definitionVersion?: string | null;
  /** `|u:<id>|r:<role>|`, `null` when it waits on nobody in particular (`assignees.ts`). */
  assignees?: string | null;
  revision: number;
  activeKey: string;
  completedAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** The host's visibility fields (`visibility.fields`), by name. */
  [visibility: string]: unknown;
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
  visit: doc.visit ?? 0,
  visited: doc.visited ?? [doc.stage],
  nextSeq: doc.nextSeq ?? 1,
  definitionVersion: doc.definitionVersion ?? "",
  startedBy: doc.startedBy ?? { system: true },
  startedAt: doc.createdAt,
  ...(doc.completedAt ? { completedAt: doc.completedAt } : {}),
  ...(doc.publishedAt ? { publishedAt: doc.publishedAt } : {}),
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
    visit: state.visit,
    visited: state.visited,
    nextSeq: state.nextSeq,
    startedBy: state.startedBy,
    schemaVersion: SCHEMA_VERSION,
    definitionVersion: state.definitionVersion,
    assignees: encodeAssignees(waiting),
    activeKey:
      state.status === "active" ? activeKeyOf(state.workflow, subject) : `done:${randomUUID()}`,
    completedAt: state.completedAt ?? null,
    publishedAt: state.publishedAt ?? null,
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

export const findRuns = async (req: PayloadRequest, where: Where): Promise<InstanceDoc[]> => {
  const result = await req.payload.find({
    collection: RUNS_SLUG as CollectionSlug,
    where,
    depth: 0,
    limit: 0,
    pagination: false,
    sort: "-createdAt",
    overrideAccess: true,
    req,
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
  (
    await req.payload.count({
      collection: RUNS_SLUG as CollectionSlug,
      where: { activeKey: { equals: activeKeyOf(workflow, subject) } },
      overrideAccess: true,
      req,
    })
  ).totalDocs > 0;

// ---- Writes ---------------------------------------------------------------------------------

export interface Committed {
  doc: InstanceDoc;
  /** Effect jobs queued by this write. */
  jobs: JobId[];
}

/** Runs `fn` in a transaction: its own when `req` has none, the caller's otherwise. */
export const inTransaction = async <T>(req: PayloadRequest, fn: () => Promise<T>): Promise<T> => {
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
          stage: effect.stage,
          visit: String(effect.visit),
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

/** A write's events and effect jobs, after its run row: the jobs first, so events carry their ids. */
const record = async (req: PayloadRequest, doc: InstanceDoc, result: Result): Promise<JobId[]> => {
  const jobs = await queueEffects(req, doc.id, result.effects);
  await insertEvents(
    req,
    { run: doc.id, workflow: doc.workflow, subject: subjectOf(doc) },
    result.events,
    jobs
  );
  return jobs;
};

/**
 * Inserts a new run with its first events and its visibility values (`visibility.ts`); with
 * `recheck`, called after the insert in its transaction, the values it returns (they changed
 * since: a concurrent save that moved the document did not see this run) are written. A second
 * active run of the same workflow on a document is `already-running`.
 * Losing that race inside a caller's transaction ends the transaction (Payload rolls it back when
 * `create` fails): the error says so, so the caller does not commit believing its writes survived.
 */
export const createRun = async (
  req: PayloadRequest,
  def: WorkflowDefinition,
  result: Result,
  subject: Subject,
  visibility: Record<string, unknown> = {},
  recheck?: (inserted: InstanceDoc) => Promise<Record<string, unknown> | undefined>
): Promise<Committed> => {
  const began = await transactionOf(req);
  try {
    return await inTransaction(req, async () => {
      const doc = (await req.payload.create({
        collection: RUNS_SLUG as CollectionSlug,
        data: {
          ...visibility,
          ...toData(result.state, def, subject),
          revision: 1,
        } as never,
        depth: 0,
        overrideAccess: true,
        req,
      })) as unknown as InstanceDoc;
      const latest = recheck ? await recheck(doc) : undefined;
      if (latest) {
        await writing(req, () =>
          req.payload.db.updateOne({
            collection: RUNS_SLUG,
            id: doc.id,
            data: latest,
            req,
            returning: false,
          })
        );
        Object.assign(doc, latest);
      }
      return { doc, jobs: await record(req, doc, result) };
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

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Compute, then write only if `revision` is still what was read: a compare-and-swap in the
 * database adapter (`db.updateOne` with a `where`, as one `UPDATE … WHERE … RETURNING` on SQL).
 * Only the winner goes on to insert the step's events (numbered from the `nextSeq` it read, so the
 * numbers are exact) and queue its effects, in the same transaction; a loser has written nothing.
 * The first attempt computes on `from` when it is the run as the caller already read it;
 * otherwise, and after a lost race, the run is reloaded. After the last attempt it is `conflict`.
 * `compute` returning `null` or the state it was given means "nothing to write".
 */
export const mutateRun = async (
  req: PayloadRequest,
  def: WorkflowDefinition | undefined,
  from: JobId | InstanceDoc,
  compute: (state: InstanceState) => Result | null,
  attempts = ATTEMPTS
): Promise<Committed> => {
  const id = typeof from === "object" ? from.id : from;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      // A little jitter, so writers that lost the same race do not collide again in lockstep.
      await pause(Math.random() * 5 * attempt);
    }
    const outcome = await inTransaction(req, async (): Promise<Committed | null> => {
      const doc = attempt === 0 && typeof from === "object" ? from : await loadRun(req, id);
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
          // SQL: a single conditional UPDATE (no read-then-write), `null` when the revision moved.
          options: { atomic: true },
          req,
        })
      );
      if (!updated) {
        return null;
      }
      return { doc: updated as unknown as InstanceDoc, jobs: await record(req, doc, result) };
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

// ---- Retention ------------------------------------------------------------------------------

/** Finished runs `pruneWorkflows` deletes per transaction. */
const PRUNE_BATCH = 200;

/**
 * Deletes finished runs (completed or stopped) that finished before `finishedBefore`, with their
 * events, in batches of runs, each batch in a transaction of its own. Active runs are never
 * touched. Returns how many runs and events it deleted. The plugin never calls it: run it from
 * your own schedule, with the retention you need.
 */
export const pruneWorkflows = async (
  payload: Payload,
  { finishedBefore }: { finishedBefore: Date }
): Promise<{ runs: number; events: number }> => {
  const totals = { runs: 0, events: 0 };
  for (;;) {
    const req = await createLocalReq({}, payload);
    const deleted = await inTransaction(req, async () => {
      const page = await payload.find({
        collection: RUNS_SLUG as CollectionSlug,
        where: {
          and: [
            { status: { in: ["completed", "aborted"] } },
            { completedAt: { less_than: finishedBefore.toISOString() } },
          ],
        },
        select: {},
        sort: "id",
        limit: PRUNE_BATCH,
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      });
      const ids = page.docs.map((doc) => doc.id);
      if (ids.length === 0) {
        return 0;
      }
      const ofRuns: Where = { run: { in: ids } };
      const { totalDocs } = await payload.count({
        collection: EVENTS_SLUG as CollectionSlug,
        where: ofRuns,
        overrideAccess: true,
        req,
      });
      await writing(req, () =>
        payload.db.deleteMany({ collection: EVENTS_SLUG, where: ofRuns, req })
      );
      await writing(req, () =>
        payload.db.deleteMany({ collection: RUNS_SLUG, where: { id: { in: ids } }, req })
      );
      totals.events += totalDocs;
      return ids.length;
    });
    totals.runs += deleted;
    if (deleted < PRUNE_BATCH) {
      return totals;
    }
  }
};
