import type { Payload, PayloadRequest, TypedUser } from "payload";
import { createLocalReq } from "payload";

import { SYSTEM } from "../engine/context.js";
import { WorkflowError } from "../engine/errors.js";
import { abort, fire, start } from "../engine/operations.js";
import { settle } from "../engine/settle.js";
import type { InstanceView, Patch } from "../types.js";
import { createInstance, mutateInstance } from "./commit.js";
import type { Committed, Ctx, JobId } from "./commit.js";
import { allowedBy, callerOf, definitionOf, requireUser, resolvedOf } from "./config.js";
import type { Via } from "./config.js";
import { runJobsInline } from "./inline.js";
import { definitionForDoc, presentInstance } from "./present.js";
import { activeKeyOf, findInstances, loadInstance, subjectOf, toState } from "./store.js";
import type { InstanceDoc } from "./store.js";
import { loadSubject } from "./subject.js";

export const contextFor = async (
  payload: Payload,
  user: TypedUser | null | undefined,
  req?: PayloadRequest
): Promise<Ctx> => ({
  payload,
  req: req ?? (await createLocalReq(user ? { user } : {}, payload)),
  resolved: resolvedOf(payload),
});

/**
 * Whether effects may run right now: only when the operation committed its own transaction, or
 * there was none. A `req` still carrying a transaction belongs to a caller who has not committed
 * yet, so the jobs it queued are not visible outside it; they stay queued for the jobs runner.
 */
export const canRunInline = async (req: PayloadRequest): Promise<boolean> => {
  // Without database transactions Payload leaves a promise of `null` here.
  const id = req.transactionID instanceof Promise ? await req.transactionID : req.transactionID;
  return !id;
};

/** Runs the effects a commit queued, then answers with the run as it is now. */
const answer = async (
  ctx: Ctx,
  committed: Committed,
  user: TypedUser | null,
  via: Via,
  subject: Record<string, unknown> | null
): Promise<InstanceView> => {
  const ran = (await canRunInline(ctx.req)) && (await runJobsInline(ctx.payload, committed.jobs));
  const doc = ran
    ? await loadInstance(ctx.payload, ctx.resolved.instancesSlug, committed.doc.id, ctx.req)
    : committed.doc;
  return presentInstance(ctx, doc, user ? callerOf(ctx.resolved, user, via) : null, subject, user);
};

/** A collection no workflow runs on reads as an unknown document. */
export const assertSubjectCollection = (ctx: Ctx, collection: string): void => {
  if (!ctx.resolved.definitions.some((def) => def.collections.includes(collection))) {
    throw new WorkflowError(
      "unknown-subject",
      `There is no ${collection} document you can read with a workflow.`
    );
  }
};

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
export const startIn = async (
  ctx: Ctx,
  args: Omit<StartArgs, "user"> & { user: TypedUser | null }
): Promise<InstanceView> => {
  const { payload, req, resolved } = ctx;
  assertSubjectCollection(ctx, args.collection);
  const def = definitionOf(resolved, args.workflow);
  if (!def.collections.includes(args.collection)) {
    throw new WorkflowError(
      "unknown-workflow",
      `Workflow "${def.name}" does not run on collection "${args.collection}".`
    );
  }
  const subject = { collection: args.collection, id: String(args.id) };
  const doc = await loadSubject(payload, subject, args.user, req);
  if (
    args.user &&
    !(await allowedBy(resolved.access.start, {
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
  const running = await findInstances(
    payload,
    resolved.instancesSlug,
    { activeKey: { equals: activeKeyOf(def.name, subject) } },
    req
  );
  if (running.length > 0) {
    throw new WorkflowError(
      "already-running",
      `Workflow "${def.name}" is already running on this document.`
    );
  }
  const via = args.via ?? "api";
  const actor = args.user ? callerOf(resolved, args.user, via).actor : SYSTEM;
  const result = start(def, { fields: args.fields, actor }, { doc, now: new Date() });
  const committed = await createInstance(ctx, result, subject);
  return answer(ctx, committed, args.user, via, doc);
};

/** Starts a run of `workflow` on a document, as `user`. */
export const startWorkflow = async (payload: Payload, args: StartArgs): Promise<InstanceView> => {
  const user = requireUser(args.user);
  return startIn(await contextFor(payload, user, args.req), { ...args, user });
};

export interface FireArgs {
  instanceId: string | number;
  activity: string;
  action: string;
  params?: Record<string, unknown>;
  user: TypedUser | null | undefined;
  req?: PayloadRequest;
  via?: Via;
}

/** A person or agent fires a caller action, with their own permissions. */
export const fireWorkflowAction = async (
  payload: Payload,
  args: FireArgs
): Promise<InstanceView> => {
  const user = requireUser(args.user);
  const ctx = await contextFor(payload, user, args.req);
  const via = args.via ?? "api";
  const existing = await loadInstance(
    payload,
    ctx.resolved.instancesSlug,
    args.instanceId,
    ctx.req
  );
  const subject = await loadSubject(payload, subjectOf(existing), user, ctx.req);
  const def = definitionOf(ctx.resolved, existing.workflow);
  const allowed = await allowedBy(ctx.resolved.access.fire, {
    req: ctx.req,
    user,
    workflow: def,
    ...subjectOf(existing),
    doc: subject,
  });
  if (!allowed) {
    throw new WorkflowError("not-allowed", "You are not allowed to move this workflow.");
  }
  const caller = callerOf(ctx.resolved, user, via);
  const committed = await mutateInstance(ctx, existing.id, (_doc, state) =>
    fire(
      def,
      state,
      { activity: args.activity, action: args.action, params: args.params },
      caller,
      { doc: subject, now: new Date() }
    )
  );
  return answer(ctx, committed, user, via, subject);
};

export interface AbortArgs {
  instanceId: string | number;
  reason?: string;
  /** Who aborts it. Required: a missing user is `unauthorized`. */
  user: TypedUser | null | undefined;
  req?: PayloadRequest;
  via?: Via;
}

/** `user: null` aborts as the system (hooks only). */
export const abortIn = async (
  ctx: Ctx,
  args: Omit<AbortArgs, "user"> & { user: TypedUser | null }
): Promise<InstanceView> => {
  const { payload, req, resolved } = ctx;
  const via = args.via ?? "api";
  const existing = await loadInstance(payload, resolved.instancesSlug, args.instanceId, req);
  const subject = await loadSubject(payload, subjectOf(existing), args.user, req);
  const def = resolved.definitions.find((entry) => entry.name === existing.workflow);
  if (args.user) {
    const allowed = await allowedBy(resolved.access.abort, {
      req,
      user: args.user,
      // A run whose workflow was removed is checked against a stand-in, so it can still be aborted.
      workflow: definitionForDoc(ctx, existing),
      ...subjectOf(existing),
      doc: subject,
    });
    if (!allowed) {
      throw new WorkflowError("not-allowed", "You are not allowed to abort this workflow.");
    }
  }
  const actor = args.user ? callerOf(resolved, args.user, via).actor : SYSTEM;
  const committed = await mutateInstance(ctx, existing.id, (_doc, state) =>
    abort(def, state, { reason: args.reason, actor }, { doc: subject, now: new Date() })
  );
  return answer(ctx, committed, args.user, via, subject);
};

/** Ends an active run, as `user`. */
export const abortWorkflow = async (payload: Payload, args: AbortArgs): Promise<InstanceView> => {
  const user = requireUser(args.user);
  return abortIn(await contextFor(payload, user, args.req), { ...args, user });
};

/**
 * Settles one run as the system (after its document changed, or on the tick). Writes only when
 * something moved. Returns whether it did and the effect jobs it queued.
 *
 * `doc` may be read without `history` (see `SETTLE_SELECT`): whether anything moves is decided on
 * it first, and only a run that moves is reloaded whole and written.
 */
export const settleIn = async (
  ctx: Ctx,
  doc: InstanceDoc,
  subject: Record<string, unknown> | null,
  now = new Date()
): Promise<{ advanced: boolean; jobs: JobId[] }> => {
  const def = ctx.resolved.definitions.find((entry) => entry.name === doc.workflow);
  if (!def) {
    return { advanced: false, jobs: [] };
  }
  const read = toState(doc);
  if (settle(def, read, { doc: subject, now }).state === read) {
    return { advanced: false, jobs: [] };
  }
  const committed = await mutateInstance(ctx, doc.id, (_fresh, state) =>
    settle(def, state, { doc: subject, now })
  );
  return { advanced: committed.doc.revision !== doc.revision, jobs: committed.jobs };
};
