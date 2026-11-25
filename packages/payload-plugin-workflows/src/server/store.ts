// The runs collection: one row per run, the only place run state is stored. Two writes change it,
// `createRun` and `mutateRun`, each queueing the run's effect jobs in the same transaction.

import { randomUUID } from "node:crypto";

import type {
  Access,
  CollectionConfig,
  CollectionSlug,
  Endpoint,
  PayloadRequest,
  SelectType,
  Where,
} from "payload";
import { ValidationError, commitTransaction, initTransaction, killTransaction } from "payload";

import { formatAdminURL } from "payload/shared";

import { encodeAssignees } from "../assignees.js";
import type { TKey } from "../components/shared/format.js";
import {
  EFFECT_TASK,
  JOBS_QUEUE,
  QUEUED_JOBS,
  READ_CACHE,
  RUNS_SLUG,
  componentPath,
} from "../constants.js";
import { WorkflowError } from "../engine/errors.js";
import { NAMESPACE } from "../translations.js";
import { waitingOnOf } from "../engine/view.js";
import type { WorkflowsSettings } from "../plugin.js";
import type { InstanceState, Result, WorkflowDefinition } from "../types.js";
import { transactionLost, transactionOf, writing } from "./transaction.js";

/** A label in the admin's language, from the plugin's strings. */
const label =
  (key: TKey) =>
  ({ t }: { t: unknown }): string =>
    (t as (key: string) => string)(`${NAMESPACE}:${key}`);

/** In the database and the API; not in the admin, which shows the run in the document's drawer. */
const internal = { hidden: true } as const;

/**
 * Readable ids resolved for a subject collection whose `read` access is a per-document rule. Above
 * this the collection is left out of the runs the user may read (logged once, and named in the
 * plugin's list and state answers as `hiddenCollections`): one query, and an `IN` list well under
 * SQLite's and Postgres' bound-parameter limits.
 */
export const READABLE_IDS_CAP = 5000;

const warnedOverCap = new Set<string>();

/** `readRuns`' answer, kept on `req.context` so one request resolves it once per user. */
interface ReadCache {
  user: string;
  result: boolean | Where;
  /** Subject collections left out because the user may read more than the cap of them. */
  hidden: string[];
}

/** Subject collections whose runs `readRuns` hid from this request's user (over the cap). */
export const hiddenCollectionsOf = (req: PayloadRequest): string[] =>
  (req.context?.[READ_CACHE] as ReadCache | undefined)?.hidden ?? [];

/**
 * Who may read runs: a user of the admin user collection, and only runs on documents they may read.
 * Each subject collection's own `read` access decides for `req`: `false` leaves its runs out,
 * `true` lets them all in, a query constraint (a per-document rule) lets in the runs on the ids it
 * allows, resolved with one query as the user (latest drafts, as the plugin's own reads). A user who
 * may read every subject collection whole gets no constraint at all; one who may read none, a
 * constraint nothing matches. Resolved once per request and user (`req.context`).
 */
const readRuns: Access = async ({ req }): Promise<boolean | Where> => {
  const { user, payload } = req;
  if (!user || user.collection !== payload.config.admin?.user) {
    return false;
  }
  const key = `${user.collection}:${String(user.id)}`;
  const cached = req.context?.[READ_CACHE] as ReadCache | undefined;
  if (cached?.user === key) {
    return cached.result;
  }
  const settings = payload.config.custom?.workflows as WorkflowsSettings | undefined;
  const slugs = [...new Set(settings?.workflows.flatMap((def) => def.collections))];
  const or: Where[] = [];
  const hidden: string[] = [];
  let whole = true;
  for (const slug of slugs) {
    const collection = payload.collections[slug as CollectionSlug];
    const access = collection?.config.access?.read;
    // No function: Payload's default, any logged-in user.
    const result = collection ? (access ? await access({ req }) : true) : false;
    if (result === true) {
      or.push({ subjectCollection: { equals: slug } });
      continue;
    }
    whole = false;
    if (!result || typeof result !== "object") {
      continue;
    }
    const found = await payload.find({
      collection: slug as CollectionSlug,
      select: { id: true },
      draft: true,
      limit: READABLE_IDS_CAP + 1,
      pagination: false,
      overrideAccess: false,
      user,
      req,
    });
    if (found.docs.length > READABLE_IDS_CAP) {
      hidden.push(slug);
      if (!warnedOverCap.has(slug)) {
        warnedOverCap.add(slug);
        payload.logger.warn(
          `workflows: a user may read more than ${READABLE_IDS_CAP} "${slug}" documents under its per-document read access, so workflow runs on "${slug}" are hidden from them (runs collection, workflow lists and the dashboard widget, which say so).`
        );
      }
      continue;
    }
    if (found.docs.length > 0) {
      or.push({
        and: [
          { subjectCollection: { equals: slug } },
          { subjectId: { in: found.docs.map((doc) => String(doc.id)) } },
        ],
      });
    }
  }
  // Not `false`: that is a 403, and the plugin's reads would turn an empty list into `not-allowed`.
  let result: boolean | Where = true;
  if (!whole) {
    result = or.length > 0 ? { or } : { id: { exists: false } };
  }
  if (req.context) {
    req.context[READ_CACHE] = { user: key, result, hidden } satisfies ReadCache;
  }
  return result;
};

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
 * (`readRuns`), and written by nobody over the API: state changes only through the plugin's
 * operations, so the history cannot be edited. In the admin it is the read-only list of
 * workflows ("Workflows"): a row links to its document, where the drawer shows and moves the run.
 * The plugin's REST endpoints are this collection's (`/api/workflow-instances/state`, …). With
 * `components: false` (the plugin disabled) it keeps its data and API but has no admin cells.
 */
export const runsCollection = (options: {
  endpoints?: Endpoint[];
  components: boolean;
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
      // The list reads the shown columns (and `LIST_COLUMNS`), never the history.
      enableListViewSelectAPI: true,
      ...(options.components ? {} : { hidden: true }),
    },
    forceSelect: LIST_COLUMNS,
    access: {
      read: readRuns,
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
      { name: "history", type: "json", admin: internal },
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
    ],
  };
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
  /** `|u:<id>|r:<role>|`, `null` when it waits on nobody in particular (`assignees.ts`). */
  assignees?: string | null;
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
    assignees: encodeAssignees(waiting),
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

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Compute, then write only if `revision` is still what was read: a compare-and-swap in the
 * database adapter (`db.updateOne` with a `where`, as one `UPDATE … WHERE … RETURNING` on SQL).
 * The first attempt computes on `from` when it is the run as the caller already read it (whole,
 * with its history); otherwise, and after a lost race, the run is reloaded. After the last attempt
 * it is `conflict`. `compute` returning `null` or the state it was given means "nothing to write".
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
