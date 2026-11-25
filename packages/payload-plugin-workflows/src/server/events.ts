// The events collection: a run's history, one row per entry, append-only. Rows are inserted in the
// same transaction as the run's state change (`store.ts`) and never changed; only
// `pruneWorkflows` deletes them, with their run. Audits are ordinary queries on its columns.

import type { CollectionConfig, CollectionSlug, PayloadRequest } from "payload";

import type { TKey } from "../components/shared/format.js";
import { EVENTS_SLUG, RUNS_SLUG } from "../constants.js";
import { NAMESPACE } from "../translations.js";
import type { Actor, Cause, KnownWorkflowEvent, UserActor, WorkflowEvent } from "../types.js";
import { readWorkflowEvents } from "./access.js";
import { writing } from "./transaction.js";

const label =
  (key: TKey) =>
  ({ t }: { t: unknown }): string =>
    (t as (key: string) => string)(`${NAMESPACE}:${key}`);

const text = (name: string, extra: { index?: boolean; required?: boolean } = {}) => ({
  name,
  type: "text" as const,
  ...extra,
});

/**
 * One row per history entry. Columns are what audits filter on; whatever else an entry carries
 * (params, a reason, an error, a job id…) is in `detail`. The subject is copied onto every row so
 * an audit needs no join. An event is readable exactly when its run is (`readWorkflowEvents`: the
 * subject part on its own columns, the host's `visibility` rule through `run`). Nobody writes over
 * the API; hidden from the admin nav (the drawer shows a run's history), readable over REST,
 * GraphQL and the Local API.
 */
export const eventsCollection = (): CollectionConfig => ({
  slug: EVENTS_SLUG,
  labels: { singular: label("eventsSingular"), plural: label("eventsPlural") },
  timestamps: false,
  defaultSort: "-at",
  admin: { hidden: true, useAsTitle: "type", disableCopyToLocale: true },
  access: {
    read: readWorkflowEvents,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [
    // A run's timeline, paginated by `seq`; also makes `seq` exact per run.
    { fields: ["run", "seq"], unique: true },
    // A document's whole trail, across its runs.
    { fields: ["subjectCollection", "subjectId"] },
  ],
  fields: [
    // The run, as a relationship so the runs' visibility rule applies through it (`run.tenant`).
    // Never populated: an event answers with the run's id.
    {
      name: "run",
      type: "relationship",
      relationTo: RUNS_SLUG as CollectionSlug,
      required: true,
      maxDepth: 0,
    },
    { name: "seq", type: "number", required: true },
    text("type", { required: true, index: true }),
    { name: "at", type: "date", required: true, index: true },
    text("workflow", { required: true }),
    text("subjectCollection", { required: true }),
    text("subjectId", { required: true }),
    text("stage"),
    // Who: a user of the admin user collection (the only users who take part), by id; none on the
    // system's entries, which say what caused them (`cause`, details in `detail`).
    text("actorId", { index: true }),
    text("via"),
    text("cause"),
    // Per type: an action's activity and name, a transition's name and target, an effect's name
    // and status.
    text("activity"),
    text("action"),
    text("transition"),
    text("toStage"),
    text("effect"),
    text("status"),
    { name: "detail", type: "json" },
  ],
});

/** An events row as stored. */
export interface EventRow {
  id?: string | number;
  run: string | number;
  seq: number;
  type: string;
  at: string;
  workflow: string;
  subjectCollection: string;
  subjectId: string;
  stage?: string | null;
  actorId?: string | null;
  via?: string | null;
  cause?: string | null;
  activity?: string | null;
  action?: string | null;
  transition?: string | null;
  toStage?: string | null;
  effect?: string | null;
  status?: string | null;
  detail?: Record<string, unknown> | null;
}

/** Entry fields that have a column of their own (the rest go to `detail`). */
const COLUMNS = [
  "stage",
  "activity",
  "action",
  "transition",
  "toStage",
  "effect",
  "status",
] as const;

const BASE = new Set(["seq", "at", "actor", "cause", "type", ...COLUMNS]);

/** The run an event belongs to, as its row records it. */
export interface EventOwner {
  run: string | number;
  workflow: string;
  subject: { collection: string; id: string };
}

/** Who, as columns: the one place an actor is written (and `actorOf`, read). */
const actorColumns = (actor: Actor) =>
  actor.id === undefined ? { actorId: null, via: null } : { actorId: actor.id, via: actor.via };

const actorOf = (row: EventRow): Actor =>
  row.actorId ? { id: row.actorId, via: (row.via ?? "api") as UserActor["via"] } : { system: true };

/** An entry as a row: known fields to their columns, everything else into `detail`. */
export const toRow = (event: WorkflowEvent, owner: EventOwner): EventRow => {
  const source = event as Record<string, unknown>;
  const detail: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!BASE.has(key) && value !== undefined) {
      detail[key] = value;
    }
  }
  const { kind, ...because } = (event.cause ?? {}) as Partial<Cause> & Record<string, unknown>;
  if (Object.keys(because).length > 0) {
    detail.cause = because;
  }
  const columns: Partial<EventRow> = {};
  for (const key of COLUMNS) {
    if (typeof source[key] === "string") {
      columns[key] = source[key] as string;
    }
  }
  return {
    run: owner.run,
    seq: event.seq,
    type: event.type,
    at: event.at,
    workflow: owner.workflow,
    subjectCollection: owner.subject.collection,
    subjectId: owner.subject.id,
    ...columns,
    ...actorColumns(event.actor),
    cause: kind ?? null,
    ...(Object.keys(detail).length > 0 ? { detail } : {}),
  };
};

/** A row as an entry: the reverse of `toRow`. Entries of unknown types keep every field. */
export const eventOf = (row: EventRow): WorkflowEvent => {
  const { cause: because, ...detail } = (row.detail ?? {}) as Record<string, unknown>;
  const columns: Record<string, string> = {};
  for (const key of COLUMNS) {
    const value = row[key];
    if (typeof value === "string") {
      columns[key] = value;
    }
  }
  return {
    seq: row.seq,
    at: typeof row.at === "string" ? row.at : new Date(row.at as never).toISOString(),
    actor: actorOf(row),
    type: row.type,
    ...(row.cause ? { cause: { kind: row.cause, ...(because as object) } as Cause } : {}),
    ...columns,
    ...detail,
  } as WorkflowEvent;
};

/**
 * Inserts a step's events, each one plain insert in `req`'s transaction (tracked by `writing`). A
 * queued effect's entry gets the id of the job queued for it (`jobs`, in the same order).
 */
export const insertEvents = async (
  req: PayloadRequest,
  owner: EventOwner,
  events: KnownWorkflowEvent[],
  jobs: (string | number)[]
): Promise<void> => {
  let next = 0;
  for (const event of events) {
    const queued = event.type === "effect" && event.status === "queued";
    const job = queued ? jobs[next++] : undefined;
    const data = toRow(job === undefined ? event : { ...event, job: String(job) }, owner);
    await writing(req, () =>
      req.payload.db.create({
        collection: EVENTS_SLUG,
        data: data as unknown as Record<string, unknown>,
        req,
        returning: false,
      })
    );
  }
};

/**
 * A page of a run's events, oldest first: the `limit` latest, or the `limit` before `before` (a
 * `seq`). Full access: callers check access (or read with `user`).
 */
export const readEvents = async (
  req: PayloadRequest,
  run: string | number,
  options: {
    limit: number;
    before?: number;
    /** Read as this user, with the events' read access; full access without. */
    user?: PayloadRequest["user"];
  }
): Promise<WorkflowEvent[]> => {
  const found = await req.payload.find({
    collection: EVENTS_SLUG as CollectionSlug,
    where: {
      and: [
        { run: { equals: run } },
        ...(options.before === undefined ? [] : [{ seq: { less_than: options.before } }]),
      ],
    },
    sort: "-seq",
    limit: options.limit,
    pagination: false,
    depth: 0,
    req,
    ...(options.user ? { overrideAccess: false, user: options.user } : { overrideAccess: true }),
  });
  return (found.docs as unknown as EventRow[]).map(eventOf).reverse();
};
