import type {
  ActionDef,
  ActivityState,
  Actor,
  Env,
  FieldDef,
  HistoryEntry,
  InstanceState,
  Patch,
  QueuedEffect,
  Result,
  StageDef,
  WorkflowDefinition,
} from "../types.js";
import {
  SYSTEM,
  activitiesOf,
  conditionContext,
  evaluate,
  firedKey,
  isTerminal,
} from "./context.js";
import { WorkflowError } from "./errors.js";

const isUnset = (value: unknown): boolean => value === null || value === undefined;

const isJson = (value: unknown): boolean => {
  try {
    return JSON.stringify(value) !== undefined;
  } catch {
    return false;
  }
};

/** The value to store for a field, or a problem. `user` ids are kept as strings. */
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
      return typeof value === "string" && !Number.isNaN(Date.parse(value))
        ? { value }
        : { problem: "must be an ISO date string" };
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

/**
 * Writes a patch onto the fields: only declared fields, each checked against its type (a numeric
 * `user` id is stored as a string); `null`/`undefined` unsets.
 */
export const applyPatch = (
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
      `${label} sets undeclared field(s) ${unknown.map((key) => `"${key}"`).join(", ")}.`
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

export interface Firing {
  activity: string;
  action: ActionDef;
  actor: Actor;
  /** For a caller action: the patch its `set` produced (already computed by the caller of this). */
  patch: Patch | undefined;
  params?: Record<string, unknown>;
}

/** Records one action firing: fields, activity status, history and the effects it queues. */
export const applyAction = (
  def: WorkflowDefinition,
  state: InstanceState,
  firing: Firing,
  env: Env
): Result => {
  const at = env.now.toISOString();
  const { action, activity, actor } = firing;
  const auto = typeof action.when === "function";
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
export const enterStage = (
  state: InstanceState,
  stage: StageDef,
  env: Env,
  leaving?: { transition: string }
): InstanceState => {
  const at = env.now.toISOString();
  const history: HistoryEntry[] = leaving
    ? [
        ...state.history,
        {
          at,
          actor: SYSTEM,
          type: "transition",
          from: state.stage,
          to: stage.name,
          transition: leaving.transition,
        },
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
  if (isTerminal(stage)) {
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
