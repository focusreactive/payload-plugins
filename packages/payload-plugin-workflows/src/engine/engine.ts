// The engine: state in, state out, no Payload. Every operation returns the new run state and the
// effects it queued; the server layer loads, calls one of these, and stores the result.
//
//   start / fire / patchFields  change the run, then `settle`
//   settle                      fires due automatic actions, takes the first open transition,
//                               and repeats until nothing moves (the cascade)
//   abort                       ends the run
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
  HistoryEntry,
  InstanceState,
  ParamDef,
  Patch,
  QueuedEffect,
  Result,
  StageDef,
  SystemActor,
  ViewActionReason,
  WorkflowDefinition,
} from "../types.js";
import { WorkflowError } from "./errors.js";
import type { WorkflowErrorCode } from "./errors.js";

/** Guards against definitions whose conditions bounce between stages forever. */
export const CASCADE_LIMIT = 50;

export const SYSTEM: SystemActor = { system: true };

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

/** The user an activity's `assignee` field holds, if any. */
export const heldAssignee = (state: InstanceState, activity: ActivityDef): string | undefined => {
  const value = activity.assignee ? state.fields[activity.assignee] : undefined;
  return typeof value === "string" && value ? value : undefined;
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

/** A problem with a caller-supplied param value, or `null`. */
const paramProblem = (def: ParamDef, value: unknown): string | null => {
  switch (def.type) {
    case "string":
    case "text":
      return typeof value === "string" ? null : "must be a string";
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
      reason: `"${activity.title ?? activity.name}" is already ${status}.`,
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

/** Records one action firing: fields, activity status, history and the effects it queues. */
const applyAction = (
  def: WorkflowDefinition,
  state: InstanceState,
  firing: {
    activity: string;
    action: ActionDef;
    actor: Actor;
    /** What the action's `set` produced. */
    patch: Patch | undefined;
    params?: Record<string, unknown>;
  },
  env: Env
): Result => {
  const at = env.now.toISOString();
  const { action, activity, actor } = firing;
  const auto = isAuto(action);
  const label = `stage "${state.stage}" activity "${activity}" action "${action.name}" set`;
  const fields = firing.patch ? applyPatch(def, state.fields, firing.patch, label) : state.fields;
  const activities: Record<string, ActivityState> = action.status
    ? { ...state.activities, [activity]: { status: action.status, at, by: actor } }
    : state.activities;
  const entry: HistoryEntry = {
    at,
    actor,
    type: "action",
    stage: state.stage,
    activity,
    action: action.name,
    auto,
    ...(firing.params && Object.keys(firing.params).length > 0 ? { params: firing.params } : {}),
  };
  const effects: QueuedEffect[] = (action.effects ?? []).map((name) => ({
    name,
    activity,
    action: action.name,
  }));
  const queued: HistoryEntry[] = effects.map((effect) => ({
    at,
    actor: SYSTEM,
    type: "effect",
    effect: effect.name,
    status: "queued",
  }));
  return {
    state: {
      ...state,
      fields,
      activities,
      fired: auto ? [...state.fired, firedKey(activity, action.name)] : state.fired,
      history: [...state.history, entry, ...queued],
    },
    effects,
  };
};

/** Enters a stage: resets the visit, evaluates activity filters, completes on a terminal stage. */
const enterStage = (
  state: InstanceState,
  stage: StageDef,
  env: Env,
  transition?: string
): InstanceState => {
  const at = env.now.toISOString();
  const history: HistoryEntry[] = transition
    ? [
        ...state.history,
        { at, actor: SYSTEM, type: "transition", from: state.stage, to: stage.name, transition },
      ]
    : state.history;
  const fresh: Record<string, ActivityState> = {};
  for (const activity of activitiesOf(stage)) {
    fresh[activity.name] = { status: "active" };
  }
  const entered: InstanceState = {
    ...state,
    stage: stage.name,
    activities: fresh,
    fired: [],
    history,
  };
  const ctx = conditionContext(entered, env, stage);
  const activities: Record<string, ActivityState> = {};
  for (const activity of activitiesOf(stage)) {
    const exists = activity.filter
      ? evaluate(`stage "${stage.name}" activity "${activity.name}" filter`, activity.filter, ctx)
      : true;
    activities[activity.name] = exists ? { status: "active" } : { status: "skipped", at };
  }
  if ((stage.transitions ?? []).length === 0) {
    return {
      ...entered,
      activities,
      status: "completed",
      completedAt: at,
      history: [...history, { at, actor: SYSTEM, type: "completed" }],
    };
  }
  return { ...entered, activities };
};

// ---- The cascade --------------------------------------------------------------------------------

const fireAutoActions = (def: WorkflowDefinition, state: InstanceState, env: Env): Result => {
  let current = state;
  const effects: QueuedEffect[] = [];
  const stage = findStage(def, state.stage);
  for (const activity of activitiesOf(stage)) {
    for (const action of activity.actions) {
      if (
        !isAuto(action) ||
        statusOf(current, activity.name) !== "active" ||
        current.fired.includes(firedKey(activity.name, action.name))
      ) {
        continue;
      }
      const auto = action as AutoActionDef;
      const label = `stage "${current.stage}" activity "${activity.name}" action "${action.name}"`;
      const ctx = conditionContext(current, env, stage);
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
      const result = applyAction(
        def,
        current,
        { activity: activity.name, action, actor: SYSTEM, patch },
        env
      );
      current = result.state;
      effects.push(...result.effects);
    }
  }
  return { state: current, effects };
};

const takeTransition = (
  def: WorkflowDefinition,
  state: InstanceState,
  env: Env
): InstanceState | null => {
  const stage = findStage(def, state.stage);
  if (!stage) {
    return null;
  }
  const ctx = conditionContext(state, env, stage);
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
    return enterStage(state, target, env, transition.name);
  }
  return null;
};

/**
 * Fires due automatic actions, takes the first open transition, and repeats until nothing moves.
 * Returns the very same state object when nothing changed, so callers can skip the write.
 */
export const settle = (def: WorkflowDefinition, state: InstanceState, env: Env): Result => {
  if (state.status !== "active" || !findStage(def, state.stage)) {
    return { state, effects: [] };
  }
  let current = state;
  const effects: QueuedEffect[] = [];
  for (let round = 0; ; round += 1) {
    if (round >= CASCADE_LIMIT) {
      throw new WorkflowError(
        "cascade-limit",
        `Workflow "${def.name}" did not settle after ${CASCADE_LIMIT} steps; its conditions loop.`
      );
    }
    const fired = fireAutoActions(def, current, env);
    effects.push(...fired.effects);
    const next = takeTransition(def, fired.state, env) ?? fired.state;
    if (next === current || next.status !== "active") {
      return { state: next, effects };
    }
    current = next;
  }
};

/** Settles after a change; a cascade that ends where it began still returns the changed state. */
const settleAfter = (def: WorkflowDefinition, changed: Result, env: Env): Result => {
  const settled = settle(def, changed.state, env);
  return { state: settled.state, effects: [...changed.effects, ...settled.effects] };
};

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
    fields = applyPatch(def, initial, input.fields, "start fields");
  }
  const stage = findStage(def, def.initialStage);
  if (!stage) {
    throw new WorkflowError(
      "unknown-stage",
      `Initial stage "${def.initialStage}" is not declared.`
    );
  }
  const at = env.now.toISOString();
  const created: InstanceState = {
    workflow: def.name,
    stage: stage.name,
    status: "active",
    fields,
    activities: {},
    fired: [],
    history: [{ at, actor: input.actor, type: "started", stage: stage.name }],
    startedAt: at,
  };
  return settleAfter(def, { state: enterStage(created, stage, env), effects: [] }, env);
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
    state,
    { activity: activity.name, action, actor: caller.actor, patch, params },
    env
  );
  return settleAfter(def, fired, env);
};

/** Writes fields from outside a caller action (an effect reporting back), then settles. */
export const patchFields = (
  def: WorkflowDefinition,
  state: InstanceState,
  patch: Patch,
  env: Env
): Result => {
  assertActive(state);
  const fields = applyPatch(def, state.fields, patch, "patchFields");
  return settleAfter(def, { state: { ...state, fields }, effects: [] }, env);
};

/** Ends an active run. Needs no definition, so a stuck run can always be aborted. */
export const abort = (
  state: InstanceState,
  input: { reason?: string; actor: Actor },
  env: Env
): Result => {
  assertActive(state);
  const at = env.now.toISOString();
  const entry: HistoryEntry = {
    at,
    actor: input.actor,
    type: "aborted",
    ...(input.reason ? { reason: input.reason } : {}),
  };
  return {
    state: { ...state, status: "aborted", completedAt: at, history: [...state.history, entry] },
    effects: [],
  };
};
