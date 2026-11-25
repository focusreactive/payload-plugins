// What a person, an agent and the system do to runs: start, fire an action, abort, settle. Each
// one reads the document with the caller's access, checks `access`, calls the engine, stores the
// result (store.ts) and answers with the run's view. Endpoints, agent tools and hooks all land here.
// The operations come last; above them, what they share: access, inline effects, the answer.

import type { CollectionSlug, Payload, PayloadRequest, TypedUser, Where } from "payload";
import { createLocalReq } from "payload";

import { JOBS_QUEUE, QUEUED_JOBS, RUNS_SLUG } from "../constants.js";
import {
  SYSTEM,
  abort,
  activitiesOf,
  findStage,
  fire,
  holdMessage,
  holdingGuards,
  isAuto,
  mayAbort,
  recordBypass,
  settle,
  start,
} from "../engine/engine.js";
import { WorkflowError } from "../engine/errors.js";
import { HISTORY_IN_VIEW, view } from "../engine/view.js";
import type { WorkflowAccess, WorkflowAccessArgs, WorkflowsSettings } from "../plugin.js";
import type {
  Actor,
  Caller,
  Cause,
  GuardDef,
  GuardOperation,
  InstanceView,
  Label,
  Patch,
  StageDef,
  UserActor,
  UserRef,
  WorkflowDefinition,
} from "../types.js";
import { labelText } from "../vocabulary.js";
import { readEvents } from "./events.js";
import { createRun, isRunning, loadRun, mutateRun, subjectOf, toState } from "./store.js";
import type { Committed, InstanceDoc, JobId, Subject } from "./store.js";
import { transactionOf } from "./transaction.js";
import { visibilityOf } from "./visibility.js";

type Via = UserActor["via"];

/** The admin language of a request (`req.i18n`), for titles given per language. */
export const languageOf = (req: PayloadRequest): string | undefined => req.i18n?.language;

/** A definition's title in the request's language, else `fallback`. */
export const titleIn = (req: PayloadRequest, label: Label | undefined, fallback: string): string =>
  labelText(label, languageOf(req)) ?? fallback;

/** How a user came in: an API key is a script; any other session is someone in the admin. */
export const viaOf = (user: TypedUser): Via =>
  (user as { _strategy?: string })._strategy === "api-key" ? "api" : "admin";

/** Whether `user` is a user of the admin user collection: the only users who take part. */
export const isParticipant = (payload: Payload, user: TypedUser | null | undefined): boolean =>
  Boolean(user) && user?.collection === payload.config.admin?.user;

/** A user as a cause names them: only a user of the admin user collection is named. */
export const userRefOf = (
  payload: Payload,
  user: TypedUser | null | undefined
): UserRef | undefined =>
  user && isParticipant(payload, user) ? { id: String(user.id) } : undefined;

/** What caused a step a person or agent took (the system's entries in it). */
const STEP: Cause = { kind: "step" };

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

/**
 * Where every caller is admitted: public functions act for a real user (`unauthorized` without
 * one) of the admin user collection (`admin.user`). A user of any other auth collection is
 * `not-allowed`, whatever `access` says: user ids in runs (assignees, `user` fields, actors) are
 * ids of that one collection, so a user of another one would be mistaken for someone else.
 */
export const requireUser = (payload: Payload, user: TypedUser | null | undefined): TypedUser => {
  if (!user) {
    throw new WorkflowError("unauthorized", "You must be logged in.");
  }
  if (!isParticipant(payload, user)) {
    const admin = payload.config.admin?.user ?? "";
    throw new WorkflowError(
      "not-allowed",
      `Only users of the admin user collection ("${admin}") can take part in workflows; this request acts as a user of "${user.collection}".`
    );
  }
  return user;
};

const callerOf = (payload: Payload, user: TypedUser, via: Via): Caller => ({
  actor: { id: String(user.id), via },
  roles: settingsOf(payload).roles(user),
});

/**
 * An access check for `user` (never `req.user`), already admitted by `requireUser`. Without a
 * check of its own: allowed. Callers have already read the document with the user's access.
 */
export const allowedBy = async (
  check: WorkflowAccess | undefined,
  args: WorkflowAccessArgs
): Promise<boolean> => (check ? (await check(args)) === true : true);

/** The run as access callbacks see it. */
const runOf = (doc: InstanceDoc): NonNullable<WorkflowAccessArgs["run"]> => ({
  id: String(doc.id),
  fields: { ...(doc.fields ?? {}) },
});

/**
 * May `user` (admitted) stop this run? `access.abort` decides when the host set it. Otherwise
 * anyone, except that while a guard holds the document only one who may act in its stage
 * (`mayAbort`): stopping is never a way around a hold.
 */
const mayStop = async (
  req: PayloadRequest,
  doc: InstanceDoc,
  subject: Record<string, unknown> | null,
  user: TypedUser,
  via: Via
): Promise<boolean> => {
  const { payload } = req;
  const def = definitionOrStandIn(payload, doc);
  const check = settingsOf(payload).access.abort;
  const args: WorkflowAccessArgs = {
    req,
    user,
    workflow: def,
    ...subjectOf(doc),
    doc: subject,
    stage: doc.stage,
    run: runOf(doc),
  };
  if (check) {
    return allowedBy(check, args);
  }
  // A finished run is left to the engine, which refuses it as not active.
  return (
    doc.status !== "active" ||
    mayAbort(def, toState(doc), callerOf(payload, user, via), { doc: subject, now: new Date() })
  );
};

/**
 * Who made a document write the run records (a bypass, a publish): the user, when they take part
 * in workflows; anyone else (another auth collection, no user) is recorded as the system.
 */
export const writerOf = (payload: Payload, user: TypedUser | null | undefined): Actor =>
  user && isParticipant(payload, user) ? callerOf(payload, user, viaOf(user)).actor : SYSTEM;

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

/** The project's default locale; `undefined` when it is not localized. */
const defaultLocaleOf = (payload: Payload): string | undefined => {
  const { localization } = payload.config;
  return localization ? localization.defaultLocale : undefined;
};

/**
 * Whether `req` holds documents in a locale other than the project's default one (`all`
 * included): a hook's document must then be read again in the default locale to be evaluated.
 */
export const inOtherLocale = (req: PayloadRequest): boolean => {
  const locale = defaultLocaleOf(req.payload);
  return locale !== undefined && typeof req.locale === "string" && req.locale !== locale;
};

/**
 * Reads the subject document (latest draft) as every condition sees it: in the project's default
 * locale, with Payload's normal fallback, whatever the request's locale. As a user: with their
 * access, so a caller who cannot read the document can neither see nor move its workflow. As the
 * system (`user` null): with full access, and `null` when it is gone. The one place a document is
 * read for evaluation.
 */
export const loadSubject = async (
  req: PayloadRequest,
  subject: Subject,
  user: TypedUser | null
): Promise<Record<string, unknown> | null> => {
  const locale = defaultLocaleOf(req.payload);
  // The Local API sets a `locale` it is given on the shared `req`: put the request's back.
  const { locale: requestLocale, fallbackLocale } = req;
  const doc = await req.payload
    .findByID({
      collection: subject.collection as CollectionSlug,
      id: subject.id,
      depth: 0,
      draft: true,
      disableErrors: true,
      req,
      ...(locale === undefined ? {} : { locale }),
      ...(user ? { overrideAccess: false, user } : { overrideAccess: true }),
    })
    .finally(() => {
      if (locale !== undefined) {
        req.locale = requestLocale;
        req.fallbackLocale = fallbackLocale;
      }
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
export const canRunInline = async (req: PayloadRequest): Promise<boolean> =>
  (await transactionOf(req)) === null;

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
const SYSTEM_CALLER: Caller = { actor: { id: "system", via: "api" }, roles: [] };

/** The subject document's title (its collection's `useAsTitle`), if it has one. */
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
 * The engine's view for `user`, plus what only the server knows: the run's id, its document, its
 * most recent events (one indexed read of at most `HISTORY_IN_VIEW` rows, whatever the history's
 * length) and whether `user` may abort it (`false` without a user). `via` is how they came in: it
 * changes nothing except for an agent, which may not take a step reserved for a person
 * (`agents: "deny"`). Callers have checked that `user` may read the run.
 */
export const presentRun = async (
  req: PayloadRequest,
  doc: InstanceDoc,
  subject: Record<string, unknown> | null,
  user: TypedUser | null,
  via: Via = "api"
): Promise<InstanceView> => {
  const { payload } = req;
  const def = definitionOrStandIn(payload, doc);
  const caller = user ? callerOf(payload, user, via) : SYSTEM_CALLER;
  const events = await readEvents(req, doc.id, { limit: HISTORY_IN_VIEW });
  const projected = view(
    def,
    toState(doc),
    caller,
    { doc: subject, now: new Date() },
    { events, language: languageOf(req) }
  );
  const title = titleOf(payload, doc.subjectCollection, subject);
  const canAbort =
    doc.status === "active" && user ? await mayStop(req, doc, subject, user, via) : false;
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
  user: TypedUser | null,
  via: Via
): Promise<InstanceView> => {
  const ran = (await canRunInline(req)) && (await runJobsInline(req.payload, committed.jobs));
  const doc = ran ? await loadRun(req, committed.doc.id) : committed.doc;
  return presentRun(req, doc, subject, user, via);
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
      `You are not allowed to start "${titleIn(req, def.title, def.name)}".`
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
  // Started by nobody in particular: the auto-start on create.
  const cause: Cause = args.user ? STEP : { kind: "start" };
  const result = start(def, { fields: args.fields, actor }, { doc, now: new Date(), cause });
  const visible = visibilityOf(req, args.collection, doc);
  const committed = await createRun(req, def, result, subject, visible);
  return answer(req, committed, doc, args.user, via);
};

/** Starts a run of `workflow` on a document, as `user`. */
export const startWorkflow = async (payload: Payload, args: StartArgs): Promise<InstanceView> => {
  const user = requireUser(payload, args.user);
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
  const user = requireUser(payload, args.user);
  const req = await requestFor(payload, user, args.req);
  const via = args.via ?? "api";
  const existing = await loadRun(req, args.instanceId);
  const subject = await loadSubject(req, subjectOf(existing), user);
  const def = definitionOf(payload, existing.workflow);
  // The activity the action is fired on: named, or the stage's only one.
  const activities = activitiesOf(findStage(def, existing.stage));
  const activity = args.activity ?? (activities.length === 1 ? activities[0]?.name : undefined);
  const allowed = await allowedBy(settingsOf(payload).access.fire, {
    req,
    user,
    workflow: def,
    ...subjectOf(existing),
    doc: subject,
    stage: existing.stage,
    ...(activity === undefined ? {} : { activity }),
    action: args.action,
    run: runOf(existing),
  });
  if (!allowed) {
    throw new WorkflowError("not-allowed", "You are not allowed to move this workflow.");
  }
  const caller = callerOf(payload, user, via);
  const input = { activity: args.activity, action: args.action, params: args.params };
  // The run as just read is the compare-and-swap's first attempt: no second read.
  const committed = await mutateRun(req, def, existing, (state) =>
    fire(def, state, input, caller, { doc: subject, now: new Date(), cause: STEP })
  );
  return answer(req, committed, subject, user, via);
};

// ---- Abort --------------------------------------------------------------------------------------

export interface AbortArgs {
  instanceId: string | number;
  /** Kept in the history; at most `TEXT_MAX_LENGTH` characters (`invalid-params`). */
  reason?: string;
  /** Who aborts it. Required: a missing user is `unauthorized`. */
  user: TypedUser | null | undefined;
  req?: PayloadRequest;
  via?: Via;
}

/** `user: null` aborts as the system (hooks only), with what caused it. */
export const abortRun = async (
  req: PayloadRequest,
  args: Omit<AbortArgs, "user" | "req"> & { user: TypedUser | null; cause?: Cause }
): Promise<InstanceView> => {
  const { payload } = req;
  const via = args.via ?? "api";
  const existing = await loadRun(req, args.instanceId);
  const subject = await loadSubject(req, subjectOf(existing), args.user);
  // A run whose workflow was removed is checked against a stand-in, so it can still be aborted.
  if (args.user && !(await mayStop(req, existing, subject, args.user, via))) {
    const def = definitionOrStandIn(payload, existing);
    const [guard] = settingsOf(payload).access.abort
      ? []
      : holdingGuards(def, toState(existing), { doc: subject, now: new Date() });
    const stage = findStage(def, existing.stage);
    throw new WorkflowError(
      "not-allowed",
      guard && stage
        ? `${holdMessage(guard.operations, labelText(guard.title, languageOf(req)))} Only someone who can act in “${titleIn(req, stage.title, stage.name)}” may stop the workflow now.`
        : "You are not allowed to stop this workflow."
    );
  }
  const actor = args.user ? callerOf(payload, args.user, via).actor : SYSTEM;
  const def = settingsOf(payload).workflows.find((entry) => entry.name === existing.workflow);
  const cause = args.user ? STEP : args.cause;
  const committed = await mutateRun(req, def, existing, (state) =>
    abort(state, { reason: args.reason, actor }, { doc: subject, now: new Date(), cause })
  );
  return answer(req, committed, subject, args.user, via);
};

/** Ends an active run, as `user`. */
export const abortWorkflow = async (payload: Payload, args: AbortArgs): Promise<InstanceView> => {
  const user = requireUser(payload, args.user);
  return abortRun(await requestFor(payload, user, args.req), { ...args, user });
};

// ---- Settle (after a save, on the tick) ---------------------------------------------------------

/**
 * Settles one run as the system, for `cause` (a save, the tick). Writes only when something moved
 * (decided on `doc` as read, with no write); returns whether it did and the effect jobs it queued.
 */
export const settleRun = async (
  req: PayloadRequest,
  doc: InstanceDoc,
  subject: Record<string, unknown> | null,
  cause: Cause,
  now = new Date()
): Promise<{ advanced: boolean; jobs: JobId[] }> => {
  const def = settingsOf(req.payload).workflows.find((entry) => entry.name === doc.workflow);
  if (!def) {
    return { advanced: false, jobs: [] };
  }
  const env = { doc: subject, now, cause };
  const read = toState(doc);
  if (settle(def, read, env).state === read) {
    return { advanced: false, jobs: [] };
  }
  const committed = await mutateRun(req, def, doc, (state) => settle(def, state, env));
  return { advanced: committed.doc.revision !== doc.revision, jobs: committed.jobs };
};

/**
 * Leaves a trace on a run when a write went through its holding `guards` with the bypass flag:
 * a `guard-bypassed` event naming the operation and who wrote (`user`, else the system). In the
 * write's own transaction.
 */
export const traceBypass = async (
  req: PayloadRequest,
  doc: InstanceDoc,
  input: { operation: GuardOperation; guards: GuardDef[]; user: TypedUser | null | undefined }
): Promise<void> => {
  const def = settingsOf(req.payload).workflows.find((entry) => entry.name === doc.workflow);
  const guards = input.guards.map((guard) => guard.name);
  await mutateRun(req, def, doc, (state) =>
    recordBypass(
      state,
      { operation: input.operation, guards, actor: writerOf(req.payload, input.user) },
      { doc: null, now: new Date(), cause: { kind: "save" } }
    )
  );
};

/** Active runs the tick reads per page. */
const TICK_PAGE = 100;

/**
 * Whether a run in this stage can move with no write to it: only an automatic action or a
 * transition with its own `when` can (they may read `now` or the document). A transition without
 * `when` waits for the stage's activities, which only a write changes.
 */
const movesOnItsOwn = (stage: StageDef): boolean =>
  activitiesOf(stage).some((activity) => activity.actions.some(isAuto)) ||
  (stage.transitions ?? []).some((transition) => transition.when !== undefined);

/** The active runs the tick looks at: those in a stage that can move on its own. */
const tickable = (workflows: WorkflowDefinition[]): Where[] =>
  workflows.flatMap((def) => {
    const stages = def.stages.filter(movesOnItsOwn).map((stage) => stage.name);
    return stages.length > 0
      ? [{ and: [{ workflow: { equals: def.name } }, { stage: { in: stages } }] as Where[] }]
      : [];
  });

/**
 * The subject documents of `runs` (latest draft, full access), one query per collection, keyed by
 * `collection:id`; a missing one (or a collection that is gone) is absent.
 */
const loadSubjects = async (
  req: PayloadRequest,
  runs: InstanceDoc[]
): Promise<Map<string, Record<string, unknown>>> => {
  const byCollection = new Map<string, string[]>();
  for (const run of runs) {
    byCollection.set(run.subjectCollection, [
      ...(byCollection.get(run.subjectCollection) ?? []),
      run.subjectId,
    ]);
  }
  const subjects = new Map<string, Record<string, unknown>>();
  for (const [collection, ids] of byCollection) {
    if (!req.payload.collections[collection as CollectionSlug]) {
      continue;
    }
    const found = await req.payload.find({
      collection: collection as CollectionSlug,
      where: { id: { in: [...new Set(ids)] } },
      depth: 0,
      draft: true,
      limit: ids.length,
      pagination: false,
      overrideAccess: true,
      req,
    });
    for (const doc of found.docs as Record<string, unknown>[]) {
      subjects.set(`${collection}:${String(doc.id)}`, doc);
    }
  }
  return subjects;
};

/**
 * Settles the active runs that can move on their own (see `movesOnItsOwn`) with the current time:
 * needed only for conditions that read `now`. Documents are read per page, one query per
 * collection. One broken run is logged and skipped, never stops the others.
 */
export const tickWorkflows = async (
  payload: Payload
): Promise<{ checked: number; advanced: number }> => {
  const req = await requestFor(payload, null);
  const candidates = tickable(settingsOf(payload).workflows);
  let checked = 0;
  let advanced = 0;
  if (candidates.length === 0) {
    return { checked, advanced };
  }
  const jobs: JobId[] = [];
  // Keyset pages by id: a run that completes drops out of `active` without shifting later pages.
  let after: string | number | undefined;
  for (;;) {
    const page = await payload.find({
      collection: RUNS_SLUG as CollectionSlug,
      where: {
        and: [
          { status: { equals: "active" } },
          { or: candidates },
          ...(after === undefined ? [] : [{ id: { greater_than: after } }]),
        ],
      },
      sort: "id",
      limit: TICK_PAGE,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    });
    const active = page.docs as unknown as InstanceDoc[];
    const subjects = await loadSubjects(req, active).catch((error: unknown) => {
      payload.logger.error({ err: error, msg: "workflows: tick could not read the documents" });
      return null;
    });
    for (const doc of subjects ? active : []) {
      checked += 1;
      try {
        const subject = subjects?.get(`${doc.subjectCollection}:${doc.subjectId}`) ?? null;
        const outcome = await settleRun(req, doc, subject, { kind: "tick" });
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
