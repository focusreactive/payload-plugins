// The engine: state in, state out, no Payload. Every operation returns the new run state, the
// effects it queued and the history entries (events) it produced, numbered from the state's
// `nextSeq`; the server layer loads, calls one of these, and stores the state and the events.
//
//   start / fire / patchFields  change the run, then `settle`
//   settle                      fires due automatic actions, takes the first open transition,
//                               and repeats until nothing moves (the cascade)
//   abort                       ends the run
//   recordEffect / recordBypass record what happened outside the engine
//
// The file reads from the bottom up: each section is built from the ones above it. Above the
// operations: the cascade, its steps, who may fire (the verdict), params and field types, guards,
// and what conditions see.

import type {
  ActionDef,
  ActivityDef,
  ActivityState,
  ActivityStatus,
  Actor,
  AutoActionDef,
  Caller,
  CallerActionDef,
  CallerContext,
  ConditionContext,
  Env,
  FieldDef,
  GuardDef,
  GuardOperation,
  InstanceState,
  KnownWorkflowEvent,
  ParamDef,
  Patch,
  QueuedEffect,
  Result,
  StageDef,
  SystemActor,
  ViewActionReason,
  WorkflowDefinition,
} from "../types.js";
import { TEXT_MAX_LENGTH } from "../constants.js";
import { definitionVersionOf } from "../define.js";
import { labelText } from "../vocabulary.js";
import { WorkflowError } from "./errors.js";
import type { WorkflowErrorCode } from "./errors.js";

/** Guards against definitions whose conditions bounce between stages forever. */
export const CASCADE_LIMIT = 50;

export const SYSTEM: SystemActor = { system: true };

// ---- Events -------------------------------------------------------------------------------------

/** An event before it is numbered: the engine numbers a step's events once, at the end. */
type Draft = KnownWorkflowEvent extends infer E
  ? E extends unknown
    ? Omit<E, "seq">
    : never
  : never;

/** What the steps inside an operation pass along: the state so far and what it produced. */
interface Step {
  state: InstanceState;
  effects: QueuedEffect[];
  events: Draft[];
}

/** A new entry at `env.now`; the system's entries carry `env.cause`. */
const newEvent = (env: Env, actor: Actor, body: DistributiveBody): Draft =>
  ({
    at: env.now.toISOString(),
    actor,
    ...(actor.id === undefined && env.cause ? { cause: env.cause } : {}),
    ...body,
  }) as Draft;

type DistributiveBody = Draft extends infer E
  ? E extends unknown
    ? Omit<E, "at" | "actor" | "cause">
    : never
  : never;

/**
 * Numbers a step's events from the state's `nextSeq` and advances it. A step that produced nothing
 * returns its state as is (the very same object), so callers can tell nothing happened.
 */
const numbered = (step: Step): Result => {
  if (step.events.length === 0) {
    return { state: step.state, effects: step.effects, events: [] };
  }
  const first = step.state.nextSeq;
  const events = step.events.map(
    (event, i) => ({ ...event, seq: first + i }) as KnownWorkflowEvent
  );
  return {
    state: { ...step.state, nextSeq: first + events.length },
    effects: step.effects,
    events,
  };
};

// ---- What conditions see ------------------------------------------------------------------------

export const findStage = (def: WorkflowDefinition, name: string): StageDef | undefined =>
  def.stages.find((stage) => stage.name === name);

export const activitiesOf = (stage: StageDef | undefined): ActivityDef[] => stage?.activities ?? [];

export const isAuto = (action: ActionDef): boolean => typeof action.when === "function";

const firedKey = (activity: string, action: string): string => `${activity}/${action}`;

/** An activity's status this visit; one added to the definition after the run entered is active. */
export const statusOf = (state: InstanceState, activity: string): ActivityStatus =>
  (Object.hasOwn(state.activities, activity) ? state.activities[activity]?.status : undefined) ??
  "active";

const quoted = (values: string[]): string => values.map((value) => `"${value}"`).join(", ");

/** Runs a definition callback; a throw becomes a `condition-error` naming where it came from. */
const evaluate = <T, C>(label: string, fn: (ctx: C) => T, ctx: C): T => {
  try {
    return fn(ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new WorkflowError("condition-error", `${label} threw: ${message}`);
  }
};

/**
 * What conditions see. Activities come from the current stage's definition, their statuses from
 * the state: one removed from code no longer counts, one added after stage entry counts as active.
 */
const conditionContext = (
  state: InstanceState,
  env: Env,
  stage: StageDef | undefined
): ConditionContext => {
  const activities: Record<string, ActivityStatus> = {};
  for (const activity of activitiesOf(stage)) {
    activities[activity.name] = statusOf(state, activity.name);
  }
  const statuses = Object.values(activities);
  return {
    fields: { ...state.fields },
    activities,
    allActivitiesDone: statuses.every((status) => status === "done" || status === "skipped"),
    anyActivityFailed: statuses.includes("failed"),
    doc: env.doc,
    now: env.now,
    stage: state.stage,
  };
};

/**
 * The user an activity's `assignee` field holds, if any, as a string. Fails closed: any non-empty
 * stored value holds the activity (a numeric id included), so nobody else may act on it.
 */
export const heldAssignee = (state: InstanceState, activity: ActivityDef): string | undefined => {
  const value = activity.assignee ? state.fields[activity.assignee] : undefined;
  return value === undefined || value === null || value === "" ? undefined : String(value);
};

/** Whether the caller is assigned: a held assignee shadows the role pool; neither => everyone. */
const isAssigned = (activity: ActivityDef, state: InstanceState, caller: Caller): boolean => {
  const held = heldAssignee(state, activity);
  if (held) {
    return held === caller.actor.id;
  }
  if (activity.roles && activity.roles.length > 0) {
    return activity.roles.some((role) => caller.roles.includes(role));
  }
  return true;
};

const callerContext = (
  state: InstanceState,
  env: Env,
  stage: StageDef | undefined,
  activity: ActivityDef,
  caller: Caller
): CallerContext => ({
  ...conditionContext(state, env, stage),
  actor: caller.actor,
  roles: [...caller.roles],
  assigned: isAssigned(activity, state, caller),
});

// ---- Guards -------------------------------------------------------------------------------------

/**
 * Guards of the current stage that hold right now. An `unless` that throws keeps its guard
 * holding: when in doubt, the gate stays shut.
 */
export const holdingGuards = (
  def: WorkflowDefinition,
  state: InstanceState,
  env: Env
): GuardDef[] => {
  if (state.status !== "active") {
    return [];
  }
  const stage = findStage(def, state.stage);
  const guards = stage?.guards ?? [];
  if (guards.length === 0) {
    return [];
  }
  const ctx = conditionContext(state, env, stage);
  return guards.filter((guard) => {
    try {
      return !guard.unless?.(ctx);
    } catch {
      return true;
    }
  });
};

const HELD: Record<GuardOperation, string> = {
  publish: "publishing",
  update: "saving",
  delete: "deleting",
};

/**
 * What a hold says, in plain words: what is on hold, then the guard's own title ("Publishing is on
 * hold. A reviewer must approve this page first."). The refusal of a guarded write reads the same.
 */
export const holdMessage = (operations: string[], title?: string): string => {
  const words = operations.map((operation) => HELD[operation as GuardOperation] ?? operation);
  const listed =
    words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : (words[0] ?? "");
  const lead = `${listed.charAt(0).toUpperCase()}${listed.slice(1)} ${words.length > 1 ? "are" : "is"} on hold`;
  return title ? `${lead}. ${title}` : `${lead} until this stage is done.`;
};

// ---- Params and field values --------------------------------------------------------------------

const isUnset = (value: unknown): boolean => value === null || value === undefined;

const isJson = (value: unknown): boolean => {
  try {
    return JSON.stringify(value) !== undefined;
  } catch {
    return false;
  }
};

const isDate = (value: unknown): boolean =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

/** A problem with free text that is too long to keep in the history, or `null`. */
const lengthProblem = (value: string, max = TEXT_MAX_LENGTH): string | null =>
  value.length > max ? `must be at most ${max} characters` : null;

/** A problem with a caller-supplied param value, or `null`. */
const paramProblem = (def: ParamDef, value: unknown): string | null => {
  switch (def.type) {
    case "string":
    case "text":
      return typeof value === "string" ? lengthProblem(value, def.maxLength) : "must be a string";
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? null : "must be a number";
    case "boolean":
      return typeof value === "boolean" ? null : "must be a boolean";
    case "date":
      return isDate(value) ? null : "must be an ISO date string";
    case "select": {
      const allowed = (def.options ?? []).map((option) =>
        typeof option === "string" ? option : option.value
      );
      return typeof value === "string" && allowed.includes(value)
        ? null
        : `must be one of ${quoted(allowed)}`;
    }
    default:
      return "has an unknown type";
  }
};

/** Checks caller-supplied params against the action's declaration; returns only declared ones. */
export const validateParams = (
  defs: ParamDef[] | undefined,
  params: Record<string, unknown> | undefined
): Record<string, unknown> => {
  const declared = defs ?? [];
  const input = params ?? {};
  const problems: string[] = [];
  const values: Record<string, unknown> = {};
  for (const name of Object.keys(input)) {
    if (!declared.some((def) => def.name === name)) {
      problems.push(`"${name}" is not a parameter of this action`);
    }
  }
  for (const def of declared) {
    // Own properties only: a param named like an `Object.prototype` member must not read it.
    const value = Object.hasOwn(input, def.name) ? input[def.name] : undefined;
    if (isUnset(value) || value === "") {
      if (def.required) {
        problems.push(`"${def.name}" is required`);
      }
      continue;
    }
    const problem = paramProblem(def, value);
    if (problem) {
      problems.push(`"${def.name}" ${problem}`);
    } else {
      values[def.name] = value;
    }
  }
  if (problems.length > 0) {
    throw new WorkflowError("invalid-params", `Invalid parameters: ${problems.join("; ")}.`);
  }
  return values;
};

/** The value to store for a field, or a problem. A numeric `user` id is stored as a string. */
const checkValue = (
  field: FieldDef,
  value: unknown
): { value: unknown; problem?: undefined } | { problem: string } => {
  switch (field.type) {
    case "string":
    case "text":
      return typeof value === "string" ? { value } : { problem: "must be a string" };
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? { value }
        : { problem: "must be a finite number" };
    case "boolean":
      return typeof value === "boolean" ? { value } : { problem: "must be a boolean" };
    case "date":
      return isDate(value) ? { value } : { problem: "must be an ISO date string" };
    case "user":
      if (typeof value === "number" && Number.isFinite(value)) {
        return { value: String(value) };
      }
      return typeof value === "string" ? { value } : { problem: "must be a user id" };
    case "json":
      return isJson(value) ? { value } : { problem: "must be JSON-serialisable" };
    default:
      return { problem: "has an unknown type" };
  }
};

/** Writes a patch onto the fields: declared fields only, each type-checked; `null` unsets. */
const applyPatch = (
  def: WorkflowDefinition,
  fields: Record<string, unknown>,
  patch: Patch,
  label: string
): Record<string, unknown> => {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new WorkflowError("invalid-patch", `${label} must produce an object of field values.`);
  }
  const declared = new Map((def.fields ?? []).map((field) => [field.name, field]));
  const unknown = Object.keys(patch).filter((key) => !declared.has(key));
  if (unknown.length > 0) {
    throw new WorkflowError(
      "invalid-patch",
      `${label} sets undeclared field(s) ${quoted(unknown)}.`
    );
  }
  const merged: Record<string, unknown> = { ...fields };
  const problems: string[] = [];
  for (const [key, raw] of Object.entries(patch)) {
    const checked = isUnset(raw)
      ? { value: undefined }
      : checkValue(declared.get(key) as FieldDef, raw);
    if (checked.problem === undefined) {
      merged[key] = checked.value;
    } else {
      problems.push(`field "${key}" ${checked.problem}`);
    }
  }
  if (problems.length > 0) {
    throw new WorkflowError("invalid-patch", `${label}: ${problems.join("; ")}.`);
  }
  return Object.fromEntries(Object.entries(merged).filter(([, value]) => !isUnset(value)));
};

// ---- Who may fire: the one verdict `fire` and the view share ------------------------------------

export type Verdict =
  | { allowed: true }
  | {
      allowed: false;
      code: Extract<
        WorkflowErrorCode,
        "instance-not-active" | "activity-not-active" | "not-allowed"
      >;
      reason: string;
      reasonCode: Exclude<ViewActionReason, "error">;
    };

/**
 * May this caller fire this caller action right now? Both `fire` and the view use it, so a button
 * shown enabled never fails for a reason the UI could have known.
 */
export const verdictFor = (
  state: InstanceState,
  stage: StageDef | undefined,
  activity: ActivityDef,
  action: CallerActionDef,
  caller: Caller,
  env: Env
): Verdict => {
  if (state.status !== "active") {
    return {
      allowed: false,
      code: "instance-not-active",
      reason: `The workflow is ${state.status}.`,
      reasonCode: "not-active",
    };
  }
  const status = statusOf(state, activity.name);
  if (status !== "active") {
    return {
      allowed: false,
      code: "activity-not-active",
      reason: `"${labelText(activity.title) ?? activity.name}" is already ${status}.`,
      reasonCode: "not-active",
    };
  }
  const ctx = callerContext(state, env, stage, activity, caller);
  if (!ctx.assigned) {
    return {
      allowed: false,
      code: "not-allowed",
      reason: heldAssignee(state, activity)
        ? "This is assigned to someone else."
        : `Requires one of the roles ${quoted(activity.roles ?? [])}.`,
      reasonCode: "assignment",
    };
  }
  if (action.roles?.length && !action.roles.some((role) => ctx.roles.includes(role))) {
    return {
      allowed: false,
      code: "not-allowed",
      reason: `Requires one of the roles ${quoted(action.roles)}.`,
      reasonCode: "roles",
    };
  }
  const label = `activity "${activity.name}" action "${action.name}" filter`;
  if (action.filter && !evaluate(label, action.filter, ctx)) {
    return {
      allowed: false,
      code: "not-allowed",
      reason: "Not available right now.",
      reasonCode: "filter",
    };
  }
  // Last: whatever refuses everyone is the reason a person who may not act is given.
  if (action.agents === "deny" && caller.actor.via === "agent") {
    return {
      allowed: false,
      code: "not-allowed",
      reason: "This step is reserved for a person.",
      reasonCode: "agents",
    };
  }
  return { allowed: true };
};

/**
 * May this caller stop the run? While a guard of the current stage holds the document, only
 * someone who may take one of its actions right now (the same verdict as `fire`), so stopping is
 * never a way around a hold. Otherwise, or when the run is stuck, yes. `access.abort` replaces this.
 */
export const mayAbort = (
  def: WorkflowDefinition,
  state: InstanceState,
  caller: Caller,
  env: Env
): boolean => {
  if (state.status !== "active") {
    return false;
  }
  const stage = findStage(def, state.stage);
  if (!stage || holdingGuards(def, state, env).length === 0) {
    return true;
  }
  return activitiesOf(stage).some((activity) =>
    activity.actions.some((action) => {
      if (isAuto(action)) {
        return false;
      }
      try {
        return verdictFor(state, stage, activity, action as CallerActionDef, caller, env).allowed;
      } catch {
        return false;
      }
    })
  );
};

// ---- Steps --------------------------------------------------------------------------------------

/** Which visit of its stage the run is in: the transitions it has taken (kept on the run). */
export const visitOf = (state: InstanceState): number => state.visit;

/** Records one action firing: fields, activity status, its entry and the effects it queues. */
const applyAction = (
  def: WorkflowDefinition,
  step: Step,
  firing: {
    activity: string;
    action: ActionDef;
    actor: Actor;
    /** What the action's `set` produced. */
    patch: Patch | undefined;
    params?: Record<string, unknown>;
  },
  env: Env
): Step => {
  const { state } = step;
  const at = env.now.toISOString();
  const { action, activity, actor } = firing;
  const auto = isAuto(action);
  const label = `stage "${state.stage}" activity "${activity}" action "${action.name}" set`;
  const fields = firing.patch ? applyPatch(def, state.fields, firing.patch, label) : state.fields;
  const activities: Record<string, ActivityState> = action.status
    ? { ...state.activities, [activity]: { status: action.status, at, by: actor } }
    : state.activities;
  const effects: QueuedEffect[] = (action.effects ?? []).map((name) => ({
    name,
    activity,
    action: action.name,
    stage: state.stage,
    visit: state.visit,
  }));
  return {
    state: {
      ...state,
      fields,
      activities,
      fired: auto ? [...state.fired, firedKey(activity, action.name)] : state.fired,
    },
    effects: [...step.effects, ...effects],
    events: [
      ...step.events,
      newEvent(env, actor, {
        type: "action",
        stage: state.stage,
        activity,
        action: action.name,
        ...(firing.params && Object.keys(firing.params).length > 0
          ? { params: firing.params }
          : {}),
      }),
      ...effects.map((effect) =>
        newEvent(env, SYSTEM, {
          type: "effect",
          stage: effect.stage,
          effect: effect.name,
          status: "queued",
        })
      ),
    ],
  };
};

/**
 * Enters a stage: counts the visit (after a transition), resets the activities, evaluates their
 * `skipIf`, and completes the run on a terminal stage.
 */
const enterStage = (step: Step, stage: StageDef, env: Env, transition?: string): Step => {
  const { state } = step;
  const at = env.now.toISOString();
  const events = transition
    ? [
        ...step.events,
        newEvent(env, SYSTEM, {
          type: "transition",
          stage: state.stage,
          transition,
          toStage: stage.name,
        }),
      ]
    : step.events;
  const fresh: Record<string, ActivityState> = {};
  for (const activity of activitiesOf(stage)) {
    fresh[activity.name] = { status: "active" };
  }
  const entered: InstanceState = {
    ...state,
    stage: stage.name,
    activities: fresh,
    fired: [],
    visit: transition ? state.visit + 1 : state.visit,
    visited: state.visited.includes(stage.name) ? state.visited : [...state.visited, stage.name],
  };
  const ctx = conditionContext(entered, env, stage);
  const activities: Record<string, ActivityState> = {};
  for (const activity of activitiesOf(stage)) {
    const skipped = activity.skipIf
      ? evaluate(`stage "${stage.name}" activity "${activity.name}" skipIf`, activity.skipIf, ctx)
      : false;
    activities[activity.name] = skipped ? { status: "skipped", at } : { status: "active" };
  }
  if ((stage.transitions ?? []).length === 0) {
    return {
      state: { ...entered, activities, status: "completed", completedAt: at },
      effects: step.effects,
      events: [...events, newEvent(env, SYSTEM, { type: "completed", stage: stage.name })],
    };
  }
  return { state: { ...entered, activities }, effects: step.effects, events };
};

// ---- The cascade --------------------------------------------------------------------------------

const fireAutoActions = (def: WorkflowDefinition, step: Step, env: Env): Step => {
  let current = step;
  const stage = findStage(def, step.state.stage);
  for (const activity of activitiesOf(stage)) {
    for (const action of activity.actions) {
      if (
        !isAuto(action) ||
        statusOf(current.state, activity.name) !== "active" ||
        current.state.fired.includes(firedKey(activity.name, action.name))
      ) {
        continue;
      }
      const auto = action as AutoActionDef;
      const label = `stage "${current.state.stage}" activity "${activity.name}" action "${action.name}"`;
      const ctx = conditionContext(current.state, env, stage);
      if (!evaluate(`${label} when`, auto.when, ctx)) {
        continue;
      }
      const patch =
        typeof auto.set === "function"
          ? evaluate(`${label} set`, auto.set, {
              ...ctx,
              actor: SYSTEM,
              roles: [],
              assigned: true,
              params: {},
            })
          : auto.set;
      current = applyAction(
        def,
        current,
        { activity: activity.name, action, actor: SYSTEM, patch },
        env
      );
    }
  }
  return current;
};

const takeTransition = (def: WorkflowDefinition, step: Step, env: Env): Step | null => {
  const stage = findStage(def, step.state.stage);
  if (!stage) {
    return null;
  }
  const ctx = conditionContext(step.state, env, stage);
  for (const transition of stage.transitions ?? []) {
    const open = transition.when
      ? evaluate(`stage "${stage.name}" transition "${transition.name}" when`, transition.when, ctx)
      : ctx.allActivitiesDone;
    if (!open) {
      continue;
    }
    const target = findStage(def, transition.to);
    if (!target) {
      throw new WorkflowError(
        "unknown-stage",
        `Transition "${transition.name}" leads to undeclared stage "${transition.to}".`
      );
    }
    return enterStage(step, target, env, transition.name);
  }
  return null;
};

/** The cascade on a step: auto actions, the first open transition, until nothing moves. */
const settleStep = (def: WorkflowDefinition, step: Step, env: Env): Step => {
  if (step.state.status !== "active" || !findStage(def, step.state.stage)) {
    return step;
  }
  let current = step;
  for (let round = 0; ; round += 1) {
    if (round >= CASCADE_LIMIT) {
      throw new WorkflowError(
        "cascade-limit",
        `Workflow "${def.name}" did not settle after ${CASCADE_LIMIT} steps; its conditions loop.`
      );
    }
    const fired = fireAutoActions(def, current, env);
    const next = takeTransition(def, fired, env) ?? fired;
    if (next.state === current.state || next.state.status !== "active") {
      return next;
    }
    current = next;
  }
};

/**
 * Fires due automatic actions, takes the first open transition, and repeats until nothing moves.
 * Returns the very same state object when nothing changed, so callers can skip the write.
 */
export const settle = (def: WorkflowDefinition, state: InstanceState, env: Env): Result =>
  numbered(settleStep(def, { state, effects: [], events: [] }, env));

// ---- Operations ---------------------------------------------------------------------------------

const assertActive = (state: InstanceState) => {
  if (state.status !== "active") {
    throw new WorkflowError("instance-not-active", `The workflow is ${state.status}.`);
  }
};

/** The activity a caller fires on: the named one, else the stage's only one. */
const activityToFire = (stage: StageDef, name: string | undefined): ActivityDef => {
  const activities = activitiesOf(stage);
  if (name === undefined) {
    if (activities.length === 1 && activities[0]) {
      return activities[0];
    }
    throw new WorkflowError(
      "unknown-activity",
      activities.length === 0
        ? `Stage "${stage.name}" has no actions to fire.`
        : `Stage "${stage.name}" has several activities (${quoted(activities.map((entry) => entry.name))}); name the activity to fire on.`
    );
  }
  const activity = activities.find((entry) => entry.name === name);
  if (!activity) {
    throw new WorkflowError("unknown-activity", `Stage "${stage.name}" has no activity "${name}".`);
  }
  return activity;
};

/** Creates a run, enters the initial stage and settles. */
export const start = (
  def: WorkflowDefinition,
  input: { fields?: Patch; actor: Actor },
  env: Env
): Result => {
  const initial: Record<string, unknown> = {};
  for (const field of def.fields ?? []) {
    const { initialValue } = field;
    initial[field.name] =
      typeof initialValue === "function"
        ? evaluate(`field "${field.name}" initialValue`, initialValue, {
            actor: input.actor,
            doc: env.doc,
          })
        : initialValue;
  }
  // Type-checked like any write; `null` / `undefined` leave the field unset.
  let fields = applyPatch(def, {}, initial, "initial values");
  if (input.fields) {
    const notInput = Object.keys(input.fields).filter(
      (key) => !(def.fields ?? []).some((field) => field.name === key && field.input === true)
    );
    if (notInput.length > 0) {
      throw new WorkflowError(
        "invalid-patch",
        `start fields: ${quoted(notInput)} cannot be supplied when starting; only fields declared with \`input: true\` can.`
      );
    }
    fields = applyPatch(def, fields, input.fields, "start fields");
  }
  const stage = findStage(def, def.initialStage);
  if (!stage) {
    throw new WorkflowError(
      "unknown-stage",
      `Initial stage "${def.initialStage}" is not declared.`
    );
  }
  const at = env.now.toISOString();
  const definitionVersion = definitionVersionOf(def);
  const created: InstanceState = {
    workflow: def.name,
    stage: stage.name,
    status: "active",
    fields,
    activities: {},
    fired: [],
    visit: 0,
    visited: [],
    nextSeq: 1,
    definitionVersion,
    startedBy: input.actor,
    startedAt: at,
  };
  const started: Step = {
    state: created,
    effects: [],
    events: [newEvent(env, input.actor, { type: "started", stage: stage.name, definitionVersion })],
  };
  return numbered(settleStep(def, enterStage(started, stage, env), env));
};

/**
 * A caller fires an action. `activity` may be left out when the stage has a single activity (as
 * a stage with plain `actions` does). Refusals are typed, in this order: run not active, unknown
 * stage / activity / action, automatic action, the verdict, params.
 */
export const fire = (
  def: WorkflowDefinition,
  state: InstanceState,
  input: { activity?: string; action: string; params?: Record<string, unknown> },
  caller: Caller,
  env: Env
): Result => {
  assertActive(state);
  const stage = findStage(def, state.stage);
  if (!stage) {
    throw new WorkflowError(
      "unknown-stage",
      `Stage "${state.stage}" no longer exists in workflow "${def.name}"; the run can only be aborted.`
    );
  }
  const activity = activityToFire(stage, input.activity);
  const action = activity.actions.find((entry) => entry.name === input.action);
  if (!action) {
    throw new WorkflowError(
      "unknown-action",
      `Activity "${activity.name}" has no action "${input.action}".`
    );
  }
  if (isAuto(action)) {
    throw new WorkflowError(
      "not-callable",
      `Action "${action.name}" fires automatically and cannot be called.`
    );
  }
  const callable = action as CallerActionDef;
  const verdict = verdictFor(state, stage, activity, callable, caller, env);
  if (!verdict.allowed) {
    throw new WorkflowError(verdict.code, verdict.reason);
  }
  const params = validateParams(callable.params, input.params);
  const patch =
    typeof callable.set === "function"
      ? evaluate(`activity "${activity.name}" action "${action.name}" set`, callable.set, {
          ...callerContext(state, env, stage, activity, caller),
          params,
        })
      : callable.set;
  const fired = applyAction(
    def,
    { state, effects: [], events: [] },
    { activity: activity.name, action, actor: caller.actor, patch, params },
    env
  );
  return numbered(settleStep(def, fired, env));
};

/** Writes fields from outside a caller action (an effect reporting back), then settles. */
const patchStep = (def: WorkflowDefinition, step: Step, patch: Patch, env: Env): Step => {
  assertActive(step.state);
  const fields = applyPatch(def, step.state.fields, patch, "patchFields");
  return settleStep(def, { ...step, state: { ...step.state, fields } }, env);
};

/** Writes fields from outside a caller action, then settles. */
export const patchFields = (
  def: WorkflowDefinition,
  state: InstanceState,
  patch: Patch,
  env: Env
): Result => numbered(patchStep(def, { state, effects: [], events: [] }, patch, env));

/**
 * Records an effect's outcome and, if it reported fields back, applies them and settles. The
 * fields land only while the run is still in the stage visit that queued the effect
 * (`effect.stage` / `effect.visit`); otherwise the outcome is recorded as `stale` and the fields
 * are ignored.
 */
export const recordEffect = (
  def: WorkflowDefinition | undefined,
  state: InstanceState,
  effect: Pick<QueuedEffect, "name" | "stage" | "visit"> & { job?: string },
  outcome: { status: "done" | "failed"; error?: string; set?: Patch },
  env: Env
): Result => {
  const reported = outcome.set && Object.keys(outcome.set).length > 0 ? outcome.set : undefined;
  const sameVisit = state.stage === effect.stage && state.visit === effect.visit;
  const stale = Boolean(reported) && (state.status !== "active" || !sameVisit || !def);
  const recorded: Step = {
    state,
    effects: [],
    events: [
      newEvent(env, SYSTEM, {
        type: "effect",
        stage: effect.stage,
        effect: effect.name,
        status: outcome.status,
        ...(outcome.error ? { error: outcome.error } : {}),
        ...(stale ? { stale: true as const } : {}),
        ...(effect.job === undefined ? {} : { job: effect.job }),
      }),
    ],
  };
  if (!reported || stale || !def) {
    return numbered(recorded);
  }
  return numbered(patchStep(def, recorded, reported, env));
};

/**
 * Records that a write went through guards of the current stage that would have held it, with
 * the bypass flag. Changes nothing else.
 */
export const recordBypass = (
  state: InstanceState,
  input: { operation: GuardOperation; guards: string[]; actor: Actor },
  env: Env
): Result =>
  numbered({
    state,
    effects: [],
    events: [
      newEvent(env, input.actor, {
        type: "guard-bypassed",
        stage: state.stage,
        operation: input.operation,
        guards: input.guards,
      }),
    ],
  });

/** Ends an active run. Needs no definition, so a stuck run can always be aborted. */
export const abort = (
  state: InstanceState,
  input: { reason?: string; actor: Actor },
  env: Env
): Result => {
  assertActive(state);
  const problem = input.reason ? lengthProblem(input.reason) : null;
  if (problem) {
    throw new WorkflowError("invalid-params", `Invalid parameters: "reason" ${problem}.`);
  }
  const at = env.now.toISOString();
  return numbered({
    state: { ...state, status: "aborted", completedAt: at },
    effects: [],
    events: [
      newEvent(env, input.actor, {
        type: "aborted",
        stage: state.stage,
        ...(input.reason ? { reason: input.reason } : {}),
      }),
    ],
  });
};
