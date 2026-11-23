// What a person, an agent and the system do to runs: start, fire an action, abort, settle. Each
// one reads the document with the caller's access, checks `access`, calls the engine, stores the
// result (store.ts) and answers with the run's view. Endpoints, agent tools and hooks all land here.
// The operations come last; above them, what they share: access, inline effects, the answer.

import type { CollectionSlug, Payload, PayloadRequest, TypedUser } from "payload";
import { createLocalReq } from "payload";

import { JOBS_QUEUE, QUEUED_JOBS, RUNS_SLUG } from "../constants.js";
import { SYSTEM, abort, fire, settle, start } from "../engine/engine.js";
import { WorkflowError } from "../engine/errors.js";
import { view } from "../engine/view.js";
import type { WorkflowAccess, WorkflowAccessArgs, WorkflowsSettings } from "../plugin.js";
import type { Caller, InstanceView, Patch, UserActor, WorkflowDefinition } from "../types.js";
import {
  WITHOUT_HISTORY,
  createRun,
  isRunning,
  loadRun,
  mutateRun,
  subjectOf,
  toState,
} from "./store.js";
import type { Committed, InstanceDoc, JobId, Subject } from "./store.js";

type Via = UserActor["via"];

// ---- Settings, users and access -----------------------------------------------------------------

export const settingsOf = (payload: Payload): WorkflowsSettings => {
  const settings = payload.config.custom?.workflows as WorkflowsSettings | undefined;
  if (!settings) {
    throw new Error("payload-plugin-workflows: workflowsPlugin() is not installed in this config.");
  }
  return settings;
};

const definitionOf = (payload: Payload, name: string): WorkflowDefinition => {
  const def = settingsOf(payload).workflows.find((entry) => entry.name === name);
  if (!def) {
    throw new WorkflowError("unknown-workflow", `There is no workflow "${name}".`);
  }
  return def;
};

/** The definition a run was started from; a stand-in with no stages if it was removed from code. */
export const definitionOrStandIn = (payload: Payload, doc: InstanceDoc): WorkflowDefinition =>
  settingsOf(payload).workflows.find((def) => def.name === doc.workflow) ?? {
    name: doc.workflow,
    collections: [doc.subjectCollection],
    initialStage: doc.stage,
    stages: [],
  };

/** Public functions act for a real user; `null` / missing is `unauthorized`. */
export const requireUser = (user: TypedUser | null | undefined): TypedUser => {
  if (!user) {
    throw new WorkflowError("unauthorized", "You must be logged in.");
  }
  return user;
};

const callerOf = (payload: Payload, user: TypedUser, via: Via): Caller => ({
  actor: { id: String(user.id), collection: user.collection, via },
  roles: settingsOf(payload).roles(user),
});

/**
 * An access check for `user` (never `req.user`). Without a check of its own: a user of the admin
 * user collection. Callers have already read the document with the user's access.
 */
export const allowedBy = async (
  check: WorkflowAccess | undefined,
  args: WorkflowAccessArgs
): Promise<boolean> =>
  check
    ? (await check(args)) === true
    : args.user.collection === args.req.payload.config.admin?.user;

/** The request an operation runs in: the caller's, else a fresh local one. */
export const requestFor = async (
  payload: Payload,
  user: TypedUser | null,
  req?: PayloadRequest
): Promise<PayloadRequest> => req ?? (await createLocalReq(user ? { user } : {}, payload));

/** A collection no workflow runs on reads as an unknown document. */
export const assertSubjectCollection = (payload: Payload, collection: string): void => {
  if (!settingsOf(payload).workflows.some((def) => def.collections.includes(collection))) {
    throw new WorkflowError(
      "unknown-subject",
      `There is no ${collection} document you can read with a workflow.`
    );
  }
};

/**
 * Reads the subject document (latest draft). As a user: with their access, so a caller who cannot
 * read the document can neither see nor move its workflow. As the system (`user` null): with full
 * access, and `null` when it is gone.
 */
export const loadSubject = async (
  req: PayloadRequest,
  subject: Subject,
  user: TypedUser | null
): Promise<Record<string, unknown> | null> => {
  const doc = await req.payload
    .findByID({
      collection: subject.collection as CollectionSlug,
      id: subject.id,
      depth: 0,
      draft: true,
      disableErrors: true,
      req,
      ...(user ? { overrideAccess: false, user } : { overrideAccess: true }),
    })
    .catch((error: unknown) => {
      // Access denied and not found read the same: the caller learns nothing about the document.
      const status = (error as { status?: number }).status;
      if (status === 403 || status === 404) {
        return null;
      }
      throw error;
    });
  if (!doc && user) {
    throw new WorkflowError(
      "unknown-subject",
      `There is no ${subject.collection} document "${subject.id}" you can read.`
    );
  }
  return (doc as Record<string, unknown> | null) ?? null;
};

// ---- Effects that run right away ----------------------------------------------------------------

/**
 * Whether effects may run now: only when the operation committed its own transaction, or there
 * was none. A `req` still carrying a transaction belongs to a caller who has not committed yet, so
 * the jobs it queued are not visible outside it; they stay queued for the jobs runner.
 */
export const canRunInline = async (req: PayloadRequest): Promise<boolean> => {
  // Without database transactions Payload leaves a promise of `null` here.
  const id = req.transactionID instanceof Promise ? await req.transactionID : req.transactionID;
  return !id;
};

/** Max effect jobs one operation runs inline (effects that queue effects). */
const INLINE_JOB_LIMIT = 20;

/**
 * Runs just-committed effect jobs right away, so effects work with no queue setup. Effects that
 * queue further effects (an effect's `{ set }` moving the run) are picked up too, up to a limit.
 * A failed job keeps its retries and stays queued for the host's runner. Returns whether any ran.
 */
export const runJobsInline = async (payload: Payload, jobs: JobId[]): Promise<boolean> => {
  if (jobs.length === 0) {
    return false;
  }
  const queued: JobId[] = [];
  const pending = [...jobs];
  let ran = 0;
  while (pending.length > 0 && ran < INLINE_JOB_LIMIT) {
    const id = pending.shift() as JobId;
    ran += 1;
    // A fresh request (and context) per job: what one handler sets on `req.context`, such as the
    // guard bypass, must not reach the next one.
    const req = await createLocalReq({ context: { [QUEUED_JOBS]: queued } }, payload);
    try {
      // Not `jobs.runByID`: with `jobs.runHooks: true` (set by other plugins, e.g. scheduling)
      // Payload 3.90 claims the job but never runs it. `run` with a `where` on the id does both.
      await payload.jobs.run({ queue: JOBS_QUEUE, where: { id: { equals: id } }, limit: 1, req });
    } catch (error) {
      payload.logger.error({ err: error, msg: `workflows: effect job ${id} failed to run inline` });
    }
    pending.push(...queued.splice(0));
  }
  if (pending.length > 0) {
    payload.logger.warn(
      `workflows: ${pending.length} effect job(s) left queued after ${INLINE_JOB_LIMIT} inline runs`
    );
  }
  return true;
};

// ---- The answer: a run's view -------------------------------------------------------------------

/** Who the system is when a view is built for it (effect handlers): it may fire nothing. */
const SYSTEM_CALLER: Caller = { actor: { id: "system", collection: "", via: "api" }, roles: [] };

export const titleOf = (
  payload: Payload,
  collection: string,
  subject: Record<string, unknown> | null
): string | undefined => {
  const field = payload.collections[collection as CollectionSlug]?.config.admin?.useAsTitle;
  const value = field && subject ? subject[field] : undefined;
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
};

/**
 * The engine's view for `user`, plus what only the server knows: the run's id, its document and
 * whether `user` may abort it (`false` without a user).
 */
export const presentRun = async (
  req: PayloadRequest,
  doc: InstanceDoc,
  subject: Record<string, unknown> | null,
  user: TypedUser | null
): Promise<InstanceView> => {
  const { payload } = req;
  const def = definitionOrStandIn(payload, doc);
  // How the caller came in does not change what they may do.
  const caller = user ? callerOf(payload, user, "api") : SYSTEM_CALLER;
  const projected = view(def, toState(doc), caller, { doc: subject, now: new Date() });
  const title = titleOf(payload, doc.subjectCollection, subject);
  const canAbort =
    doc.status === "active" && user
      ? await allowedBy(settingsOf(payload).access.abort, {
          req,
          user,
          workflow: def,
          ...subjectOf(doc),
          doc: subject,
        })
      : false;
  return {
    ...projected,
    id: String(doc.id),
    canAbort,
    subject: { ...subjectOf(doc), ...(title === undefined ? {} : { title }) },
  };
};

/** Runs the effects a write queued, then answers with the run as it is now. */
const answer = async (
  req: PayloadRequest,
  committed: Committed,
  subject: Record<string, unknown> | null,
  user: TypedUser | null
): Promise<InstanceView> => {
  const ran = (await canRunInline(req)) && (await runJobsInline(req.payload, committed.jobs));
  const doc = ran ? await loadRun(req, committed.doc.id) : committed.doc;
  return presentRun(req, doc, subject, user);
};

// ---- Start --------------------------------------------------------------------------------------

export interface StartArgs {
  workflow: string;
  collection: string;
  id: string | number;
  /** Values for fields declared with `input: true`; any other field is `invalid-patch`. */
  fields?: Patch;
  /** Who starts it. Required: a missing user is `unauthorized`. */
  user: TypedUser | null | undefined;
  req?: PayloadRequest;
  via?: Via;
}

/** `user: null` starts as the system, with full access (hooks only). */
export const startRun = async (
  req: PayloadRequest,
  args: Omit<StartArgs, "user" | "req"> & { user: TypedUser | null }
): Promise<InstanceView> => {
  const { payload } = req;
  assertSubjectCollection(payload, args.collection);
  const def = definitionOf(payload, args.workflow);
  if (!def.collections.includes(args.collection)) {
    throw new WorkflowError(
      "unknown-workflow",
      `Workflow "${def.name}" does not run on collection "${args.collection}".`
    );
  }
  const subject = { collection: args.collection, id: String(args.id) };
  const doc = await loadSubject(req, subject, args.user);
  if (
    args.user &&
    !(await allowedBy(settingsOf(payload).access.start, {
      req,
      user: args.user,
      workflow: def,
      ...subject,
      doc,
    }))
  ) {
    throw new WorkflowError(
      "not-allowed",
      `You are not allowed to start "${def.title ?? def.name}".`
    );
  }
  if (await isRunning(req, def.name, subject)) {
    throw new WorkflowError(
      "already-running",
      `Workflow "${def.name}" is already running on this document.`
    );
  }
  const via = args.via ?? "api";
  const actor = args.user ? callerOf(payload, args.user, via).actor : SYSTEM;
  const result = start(def, { fields: args.fields, actor }, { doc, now: new Date() });
  const committed = await createRun(req, def, result, subject);
  return answer(req, committed, doc, args.user);
};

/** Starts a run of `workflow` on a document, as `user`. */
export const startWorkflow = async (payload: Payload, args: StartArgs): Promise<InstanceView> => {
  const user = requireUser(args.user);
  return startRun(await requestFor(payload, user, args.req), { ...args, user });
};

// ---- Fire an action -----------------------------------------------------------------------------

export interface FireArgs {
  instanceId: string | number;
  /** Needed only when the current stage has several activities. */
  activity?: string;
  action: string;
  params?: Record<string, unknown>;
  user: TypedUser | null | undefined;
  req?: PayloadRequest;
  via?: Via;
}

/** A person or agent fires an action, with their own permissions. */
export const fireWorkflowAction = async (
  payload: Payload,
  args: FireArgs
): Promise<InstanceView> => {
  const user = requireUser(args.user);
  const req = await requestFor(payload, user, args.req);
  const via = args.via ?? "api";
  const existing = await loadRun(req, args.instanceId);
  const subject = await loadSubject(req, subjectOf(existing), user);
  const def = definitionOf(payload, existing.workflow);
  const allowed = await allowedBy(settingsOf(payload).access.fire, {
    req,
    user,
    workflow: def,
    ...subjectOf(existing),
    doc: subject,
  });
  if (!allowed) {
    throw new WorkflowError("not-allowed", "You are not allowed to move this workflow.");
  }
  const caller = callerOf(payload, user, via);
  const input = { activity: args.activity, action: args.action, params: args.params };
  const committed = await mutateRun(req, def, existing.id, (state) =>
    fire(def, state, input, caller, { doc: subject, now: new Date() })
  );
  return answer(req, committed, subject, user);
};

// ---- Abort --------------------------------------------------------------------------------------

export interface AbortArgs {
  instanceId: string | number;
  reason?: string;
  /** Who aborts it. Required: a missing user is `unauthorized`. */
  user: TypedUser | null | undefined;
  req?: PayloadRequest;
  via?: Via;
}

/** `user: null` aborts as the system (hooks only). */
export const abortRun = async (
  req: PayloadRequest,
  args: Omit<AbortArgs, "user" | "req"> & { user: TypedUser | null }
): Promise<InstanceView> => {
  const { payload } = req;
  const via = args.via ?? "api";
  const existing = await loadRun(req, args.instanceId);
  const subject = await loadSubject(req, subjectOf(existing), args.user);
  if (args.user) {
    const allowed = await allowedBy(settingsOf(payload).access.abort, {
      req,
      user: args.user,
      // A run whose workflow was removed is checked against a stand-in, so it can still be aborted.
      workflow: definitionOrStandIn(payload, existing),
      ...subjectOf(existing),
      doc: subject,
    });
    if (!allowed) {
      throw new WorkflowError("not-allowed", "You are not allowed to abort this workflow.");
    }
  }
  const actor = args.user ? callerOf(payload, args.user, via).actor : SYSTEM;
  const def = settingsOf(payload).workflows.find((entry) => entry.name === existing.workflow);
  const committed = await mutateRun(req, def, existing.id, (state) =>
    abort(state, { reason: args.reason, actor }, { doc: subject, now: new Date() })
  );
  return answer(req, committed, subject, args.user);
};

/** Ends an active run, as `user`. */
export const abortWorkflow = async (payload: Payload, args: AbortArgs): Promise<InstanceView> => {
  const user = requireUser(args.user);
  return abortRun(await requestFor(payload, user, args.req), { ...args, user });
};

// ---- Settle (after a save, on the tick) ---------------------------------------------------------

/**
 * Settles one run as the system. Writes only when something moved; returns whether it did and the
 * effect jobs it queued. `doc` may be read without its history (`WITHOUT_HISTORY`): whether
 * anything moves is decided on it first, and only a run that moves is reloaded whole and written.
 */
export const settleRun = async (
  req: PayloadRequest,
  doc: InstanceDoc,
  subject: Record<string, unknown> | null,
  now = new Date()
): Promise<{ advanced: boolean; jobs: JobId[] }> => {
  const def = settingsOf(req.payload).workflows.find((entry) => entry.name === doc.workflow);
  if (!def) {
    return { advanced: false, jobs: [] };
  }
  const read = toState(doc);
  if (settle(def, read, { doc: subject, now }).state === read) {
    return { advanced: false, jobs: [] };
  }
  const committed = await mutateRun(req, def, doc.id, (state) =>
    settle(def, state, { doc: subject, now })
  );
  return { advanced: committed.doc.revision !== doc.revision, jobs: committed.jobs };
};

/** Active runs the tick reads per page. */
const TICK_PAGE = 100;

/**
 * Settles every active run with the current time: needed only for conditions that read `now`.
 * One broken run is logged and skipped, never stops the others.
 */
export const tickWorkflows = async (
  payload: Payload
): Promise<{ checked: number; advanced: number }> => {
  const req = await requestFor(payload, null);
  let checked = 0;
  let advanced = 0;
  const jobs: JobId[] = [];
  // Keyset pages by id: a run that completes drops out of `active` without shifting later pages.
  let after: string | number | undefined;
  for (;;) {
    const page = await payload.find({
      collection: RUNS_SLUG as CollectionSlug,
      where: {
        and: [
          { status: { equals: "active" } },
          ...(after === undefined ? [] : [{ id: { greater_than: after } }]),
        ],
      },
      select: WITHOUT_HISTORY,
      sort: "id",
      limit: TICK_PAGE,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    });
    const active = page.docs as unknown as InstanceDoc[];
    for (const doc of active) {
      checked += 1;
      try {
        const subject = await loadSubject(req, subjectOf(doc), null);
        const outcome = await settleRun(req, doc, subject);
        advanced += outcome.advanced ? 1 : 0;
        jobs.push(...outcome.jobs);
      } catch (error) {
        payload.logger.error({ err: error, msg: `workflows: tick could not settle run ${doc.id}` });
      }
    }
    if (active.length < TICK_PAGE) {
      break;
    }
    after = active.at(-1)?.id;
  }
  await runJobsInline(payload, jobs);
  return { checked, advanced };
};
